import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import tmdbService from '../services/tmdb.service.js';

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // Tracker counts and sums
    const [trackerStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_tracked,
         SUM(CASE WHEN te.status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN te.status = 'watching' THEN 1 ELSE 0 END) AS watching,
         SUM(CASE WHEN te.status = 'plan_to_watch' THEN 1 ELSE 0 END) AS plan_to_watch,
         SUM(CASE WHEN te.status = 'dropped' THEN 1 ELSE 0 END) AS dropped,
         SUM(te.episodes_watched) AS total_episodes_watched,
         SUM(CASE WHEN t.media_type = 'movie' THEN 1 ELSE 0 END) AS movies_count,
         SUM(CASE WHEN t.media_type = 'tv' THEN 1 ELSE 0 END) AS series_count
       FROM tracker_entries te
       JOIN titles t ON te.title_id = t.id
       WHERE te.user_id = ?`,
      [userId]
    );

    // Rating stats
    const [ratingStats] = await pool.query(
      `SELECT 
         COUNT(*) AS total_ratings,
         AVG(rating) AS avg_rating
       FROM ratings
       WHERE user_id = ?`,
      [userId]
    );

    // Genre distribution from tracked titles
    const [genreRows] = await pool.query(
      `SELECT t.genres 
       FROM tracker_entries te
       JOIN titles t ON te.title_id = t.id
       WHERE te.user_id = ? AND t.genres IS NOT NULL AND t.genres != ''`,
      [userId]
    );

    const genreCounts = {};
    genreRows.forEach(row => {
      const list = row.genres.split(',').map(g => g.trim()).filter(Boolean);
      list.forEach(g => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    const genreDistribution = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    const row = trackerStats[0];
    const rRow = ratingStats[0];

    res.json({
      total_tracked: Number(row.total_tracked || 0),
      completed: Number(row.completed || 0),
      watching: Number(row.watching || 0),
      plan_to_watch: Number(row.plan_to_watch || 0),
      dropped: Number(row.dropped || 0),
      total_episodes_watched: Number(row.total_episodes_watched || 0),
      movies_count: Number(row.movies_count || 0),
      series_count: Number(row.series_count || 0),
      total_ratings: Number(rRow.total_ratings || 0),
      average_user_rating: rRow.avg_rating ? Number(parseFloat(rRow.avg_rating).toFixed(1)) : 0,
      status_distribution: {
        plan_to_watch: Number(row.plan_to_watch || 0),
        watching: Number(row.watching || 0),
        completed: Number(row.completed || 0),
        dropped: Number(row.dropped || 0)
      },
      genre_distribution: genreDistribution
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/recommendations
router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;

    if (!tmdbService.isConfigured()) {
      return res.json({
        recommendations: [],
        reason: 'TMDB API key is not configured in server/.env'
      });
    }

    // 1. Get user's tracked titles to exclude from recommendations
    const [tracked] = await pool.query(
      `SELECT t.tmdb_id, t.media_type
       FROM tracker_entries te
       JOIN titles t ON te.title_id = t.id
       WHERE te.user_id = ?`,
      [userId]
    );
    const trackedKeys = new Set(tracked.map(t => `${t.media_type}_${t.tmdb_id}`));

    // 2. Query user's highly rated titles (rating >= 4), fallback to any rated or tracked titles
    let [seedTitles] = await pool.query(
      `SELECT t.tmdb_id, t.media_type, t.name, r.rating
       FROM ratings r
       JOIN titles t ON r.title_id = t.id
       WHERE r.user_id = ? AND r.rating >= 4
       ORDER BY r.rating DESC, r.updated_at DESC
       LIMIT 4`,
      [userId]
    );

    if (seedTitles.length === 0) {
      // Fallback: check any tracked titles
      const [fallback] = await pool.query(
        `SELECT t.tmdb_id, t.media_type, t.name
         FROM tracker_entries te
         JOIN titles t ON te.title_id = t.id
         WHERE te.user_id = ?
         ORDER BY te.updated_at DESC
         LIMIT 3`,
        [userId]
      );
      seedTitles = fallback;
    }

    if (seedTitles.length === 0) {
      return res.json({
        recommendations: [],
        reason: 'Rate or add titles to your tracker to get personalized recommendations.'
      });
    }

    // 3. Query TMDB similar titles for each seed title
    const candidatesMap = new Map();

    for (const seed of seedTitles) {
      try {
        const similarList = await tmdbService.getSimilar(seed.media_type, seed.tmdb_id);
        for (const item of similarList) {
          const key = `${item.media_type}_${item.tmdb_id}`;
          if (trackedKeys.has(key)) continue; // exclude already tracked

          if (!candidatesMap.has(key)) {
            candidatesMap.set(key, {
              ...item,
              frequency: 1,
              seed_source: seed.name
            });
          } else {
            const entry = candidatesMap.get(key);
            entry.frequency += 1;
          }
        }
      } catch (err) {
        // Silently skip single seed error
      }
    }

    // 4. Rank by frequency descending, then TMDB rating descending
    const recommendations = Array.from(candidatesMap.values())
      .sort((a, b) => {
        if (b.frequency !== a.frequency) {
          return b.frequency - a.frequency; // higher frequency first
        }
        return b.tmdb_rating - a.tmdb_rating;
      })
      .slice(0, 12);

    res.json({
      recommendations,
      based_on: seedTitles.map(s => s.name)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
