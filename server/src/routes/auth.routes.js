import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const router = express.Router();

// Helper to sanitize user object
function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check existing email
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, 'user']
    );

    const newUser = {
      id: result.insertId,
      name: cleanName,
      email: cleanEmail,
      role: 'user'
    };

    req.session.userId = newUser.id;
    req.session.userRole = newUser.role;
    req.session.save((err) => {
      if (err) return next(err);
      res.status(201).json({
        user: newUser,
        message: 'Account created and logged in successfully'
      });
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const [users] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [cleanEmail]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.save((err) => {
      if (err) return next(err);
      res.json({
        user: sanitizeUser(user),
        message: 'Logged in successfully'
      });
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res, next) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('moviebox.sid', { path: '/' });
      res.json({ message: 'Logged out successfully' });
    });
  } else {
    res.json({ message: 'No active session' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({ user: null });
    }

    const [users] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
      [req.session.userId]
    );

    if (users.length === 0) {
      req.session.destroy(() => {});
      return res.json({ user: null });
    }

    res.json({ user: sanitizeUser(users[0]) });
  } catch (error) {
    next(error);
  }
});

export default router;
