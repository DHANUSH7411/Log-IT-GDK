import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upsertTitle } from '../services/title.service.js';

const router = express.Router();

// GET /api/reviews/:mediaType/:tmdbId
router.get('/:mediaType/:tmdbId', async (req, res, next) => {
  try {
    const { mediaType, tmdbId } = req.params;

    const query = `
      SELECT 
        rev.id,
        rev.comment,
        rev.created_at,
        rev.updated_at,
        u.id AS user_id,
        u.name AS user_name,
        r.rating AS user_rating
      FROM reviews rev
      JOIN titles t ON rev.title_id = t.id
      JOIN users u ON rev.user_id = u.id
      LEFT JOIN ratings r ON r.user_id = rev.user_id AND r.title_id = rev.title_id
      WHERE t.tmdb_id = ? AND t.media_type = ?
      ORDER BY rev.created_at DESC
    `;

    const [rows] = await pool.query(query, [tmdbId, mediaType]);
    const reviews = rows.map(r => ({
      id: r.id,
      comment: r.comment,
      created_at: r.created_at,
      updated_at: r.updated_at,
      user: {
        id: r.user_id,
        name: r.user_name
      },
      user_rating: r.user_rating || null
    }));

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// POST /api/reviews - submit a written review
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { tmdb_id, media_type, comment, title_payload } = req.body;

    if (!comment || !comment.trim() || comment.trim().length < 3) {
      return res.status(400).json({ error: 'Review comment must be at least 3 characters' });
    }

    if (!tmdb_id || !media_type) {
      return res.status(400).json({ error: 'tmdb_id and media_type are required' });
    }

    // Ensure title exists locally
    const payload = title_payload || { tmdb_id, media_type, name: 'Untitled' };
    const titleRecord = await upsertTitle({ ...payload, tmdb_id, media_type });

    // Insert review
    const [result] = await pool.query(
      'INSERT INTO reviews (user_id, title_id, comment) VALUES (?, ?, ?)',
      [userId, titleRecord.id, comment.trim()]
    );

    // Get author details and their rating
    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [userId]);
    const [ratings] = await pool.query(
      'SELECT rating FROM ratings WHERE user_id = ? AND title_id = ? LIMIT 1',
      [userId, titleRecord.id]
    );

    res.status(201).json({
      id: result.insertId,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
      user: {
        id: userId,
        name: users[0]?.name || 'Anonymous'
      },
      user_rating: ratings[0]?.rating || null
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/reviews/:id - delete a user's review
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const reviewId = req.params.id;
    const isAdmin = req.session.userRole === 'admin';

    let deleteSql = 'DELETE FROM reviews WHERE id = ? AND user_id = ?';
    let params = [reviewId, userId];

    if (isAdmin) {
      deleteSql = 'DELETE FROM reviews WHERE id = ?';
      params = [reviewId];
    }

    const [result] = await pool.query(deleteSql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Review not found or unauthorized' });
    }

    res.json({ message: 'Review deleted successfully', id: parseInt(reviewId, 10) });
  } catch (error) {
    next(error);
  }
});

export default router;
