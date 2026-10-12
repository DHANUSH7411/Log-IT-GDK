import express from 'express';
import tmdbService from '../services/tmdb.service.js';

const router = express.Router();

// Helper to wrap TMDB calls with consistent error handling
function handleTmdbRoute(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error.code === 'TMDB_CREDENTIAL_MISSING' || error.status === 503) {
        return res.status(503).json({
          error: 'TMDB_CREDENTIAL_MISSING',
          message: error.message,
          setupInstructions: '1. Register at https://www.themoviedb.org/signup\n2. Request an API key at https://www.themoviedb.org/settings/api\n3. Add TMDB_API_KEY=your_key to server/.env\n4. Restart the backend server.'
        });
      }
      if (error.code === 'TMDB_INVALID_KEY' || error.status === 401) {
        return res.status(401).json({
          error: 'TMDB_INVALID_KEY',
          message: 'The TMDB API key in server/.env was rejected by TMDB (401 Unauthorized). Please check that the key was copied correctly.'
        });
      }
      if (error.code === 'TMDB_NETWORK_ERROR' || error.status === 502) {
        return res.status(502).json({
          error: 'TMDB_NETWORK_ERROR',
          message: error.message
        });
      }
      next(error);
    }
  };
}

// GET /api/catalogue/trending
router.get('/trending', handleTmdbRoute(async (req, res) => {
  const timeWindow = req.query.time_window || 'week';
  const data = await tmdbService.getTrending(timeWindow);
  res.json(data);
}));

// GET /api/catalogue/popular
router.get('/popular', handleTmdbRoute(async (req, res) => {
  const mediaType = req.query.media_type || 'movie';
  const page = parseInt(req.query.page || '1', 10);
  const data = await tmdbService.getPopular(mediaType, page);
  res.json(data);
}));

// GET /api/catalogue/top-rated
router.get('/top-rated', handleTmdbRoute(async (req, res) => {
  const mediaType = req.query.media_type || 'movie';
  const page = parseInt(req.query.page || '1', 10);
  const data = await tmdbService.getTopRated(mediaType, page);
  res.json(data);
}));

// GET /api/catalogue/search
router.get('/search', handleTmdbRoute(async (req, res) => {
  const query = req.query.query || '';
  if (!query.trim()) {
    return res.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
  }
  const mediaType = req.query.media_type || 'all';
  const page = parseInt(req.query.page || '1', 10);
  const data = await tmdbService.search(query, mediaType, page);
  res.json(data);
}));

// GET /api/catalogue/discover
router.get('/discover', handleTmdbRoute(async (req, res) => {
  const { media_type, genre, sort_by, year, page } = req.query;
  const data = await tmdbService.discover({
    mediaType: media_type || 'movie',
    genre,
    sortBy: sort_by || 'popularity.desc',
    year,
    page: parseInt(page || '1', 10)
  });
  res.json(data);
}));

// GET /api/catalogue/genres
router.get('/genres', handleTmdbRoute(async (req, res) => {
  const mediaType = req.query.media_type || 'movie';
  const genres = await tmdbService.getGenres(mediaType);
  res.json({ genres });
}));

// GET /api/catalogue/details/:mediaType/:tmdbId
router.get('/details/:mediaType/:tmdbId', handleTmdbRoute(async (req, res) => {
  const { mediaType, tmdbId } = req.params;
  const details = await tmdbService.getDetails(mediaType, tmdbId);
  res.json(details);
}));

// GET /api/catalogue/similar/:mediaType/:tmdbId
router.get('/similar/:mediaType/:tmdbId', handleTmdbRoute(async (req, res) => {
  const { mediaType, tmdbId } = req.params;
  const similar = await tmdbService.getSimilar(mediaType, tmdbId);
  res.json({ results: similar });
}));

export default router;
