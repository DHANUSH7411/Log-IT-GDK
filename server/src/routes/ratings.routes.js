import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upsertTitle } from '../services/title.service.js';

const router = express.Router();

// Helper to compute community rating aggregates
export async function computeCommunityStats(titleId, userId = null) {
  const [aggRows] = await pool.query(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_count FROM ratings WHERE title_id = ?',
    [titleId]
  );

  const [distRows] = await pool.query(
    'SELECT rating, COUNT(*) AS count FROM ratings WHERE title_id = ? GROUP BY rating',
    [titleId]
  );

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distRows.forEach(row => {
    distribution[row.rating] = Number(row.count);
  });

  let userRating = null;
  if (userId) {
    const [userRows] = await pool.query(
      'SELECT rating FROM ratings WHERE title_id = ? AND user_id = ? LIMIT 1',
      [titleId, userId]
    );
    if (userRows.length > 0) {
      userRating = userRows[0].rating;
    }
  }

  const rawAvg = aggRows[0]?.avg_rating;
  const average = rawAvg ? Number(parseFloat(rawAvg).toFixed(1)) : 0;
  const total = Number(aggRows[0]?.total_count || 0);

  return {
    average,
    total_ratings: total,
    distribution,
    user_rating: userRating
  };
}

// GET /api/ratings/community/:mediaType/:tmdbId
router.get('/community/:mediaType/:tmdbId', async (req, res, next) => {
  try {
    const { mediaType, tmdbId } = req.params;
    const userId = req.session?.userId || null;

    const [titles] = await pool.query(
      'SELECT id FROM titles WHERE tmdb_id = ? AND media_type = ? LIMIT 1',
      [tmdbId, mediaType]
    );

    if (titles.length === 0) {
      return res.json({
        average: 0,
        total_ratings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        user_rating: null
      });
    }

    const stats = await computeCommunityStats(titles[0].id, userId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// POST /api/ratings - submit or update 1-5 star rating
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { tmdb_id, media_type, rating, title_payload } = req.body;

    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    if (!tmdb_id || !media_type) {
      return res.status(400).json({ error: 'tmdb_id and media_type are required' });
    }

    // Ensure title exists locally
    const payload = title_payload || { tmdb_id, media_type, name: 'Untitled' };
    const titleRecord = await upsertTitle({ ...payload, tmdb_id, media_type });

    // Upsert rating
    const sql = `
      INSERT INTO ratings (user_id, title_id, rating)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.query(sql, [userId, titleRecord.id, parsedRating]);

    // Return fresh community stats
    const stats = await computeCommunityStats(titleRecord.id, userId);
    res.json({
      message: 'Rating saved successfully',
      stats
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/ratings/:mediaType/:tmdbId - remove current user's rating
router.delete('/:mediaType/:tmdbId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { mediaType, tmdbId } = req.params;

    const [titles] = await pool.query(
      'SELECT id FROM titles WHERE tmdb_id = ? AND media_type = ? LIMIT 1',
      [tmdbId, mediaType]
    );

    if (titles.length === 0) {
      return res.status(404).json({ error: 'Title not found' });
    }

    await pool.query(
      'DELETE FROM ratings WHERE title_id = ? AND user_id = ?',
      [titles[0].id, userId]
    );

    const stats = await computeCommunityStats(titles[0].id, userId);
    res.json({ message: 'Rating removed', stats });
  } catch (error) {
    next(error);
  }
});

export default router;
