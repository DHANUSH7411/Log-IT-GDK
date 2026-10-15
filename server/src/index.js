import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import pool, { checkDbHealth } from './config/db.js';
import tmdbService from './services/tmdb.service.js';

import authRoutes from './routes/auth.routes.js';
import catalogueRoutes from './routes/catalogue.routes.js';
import trackerRoutes from './routes/tracker.routes.js';
import ratingsRoutes from './routes/ratings.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const isProd = process.env.NODE_ENV === 'production';

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration for React frontend
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(url => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      // If deployed on Vercel/Netlify/Render, allow preview/subdomain deployments if configured
      console.warn(`[CORS] Blocked request from origin: ${origin}. Allowed origins:`, allowedOrigins);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL Session Store configuration
const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 900000, // 15 mins
    expiration: 86400000, // 24 hours
    createDatabaseTable: false,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  },
  pool
);

// Session middleware
app.use(
  session({
    key: 'moviebox.sid',
    secret: process.env.SESSION_SECRET || 'moviebox_cinematic_secret_2026',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  })
);

// ----------------------------------------------------
// Health Endpoint: GET /api/health
// ----------------------------------------------------
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDbHealth();
  const tmdbReady = tmdbService.isConfigured();

  res.json({
    status: dbHealth.connected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbHealth,
    tmdb: {
      configured: tmdbReady,
      note: tmdbReady
        ? 'TMDB credentials configured'
        : 'TMDB API key missing. Add TMDB_API_KEY in server/.env'
    }
  });
});

// ----------------------------------------------------
// API Route Mounts
// ----------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/catalogue', catalogueRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 Route handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[MovieBox Server Error]', err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`MovieBox API server running at http://localhost:${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_URL}`);
});
