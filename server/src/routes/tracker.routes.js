import express from 'express';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upsertTitle } from '../services/title.service.js';

const router = express.Router();

const VALID_STATUSES = ['plan_to_watch', 'watching', 'completed', 'dropped'];

// Helper to query full tracker entry with joined title & user rating
async function getTrackerEntryById(entryId, userId) {
  const query = `
    SELECT 
      te.id,
      te.user_id,
      te.title_id,
      te.status,
      te.episodes_watched,
      te.current_season,
      te.current_episode,
      te.created_at,
      te.updated_at,
      t.tmdb_id,
      t.media_type,
      t.name,
      t.genres,
      t.release_date,
      t.poster_path,
      t.backdrop_path,
      t.overview,
      t.tmdb_rating,
      t.total_episodes,
      r.rating AS user_rating
    FROM tracker_entries te
    JOIN titles t ON te.title_id = t.id
    LEFT JOIN ratings r ON r.user_id = te.user_id AND r.title_id = te.title_id
    WHERE te.id = ? AND te.user_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(query, [entryId, userId]);
  if (rows.length === 0) return null;
  return formatEntryRow(rows[0]);
}

function formatEntryRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title_id: row.title_id,
    status: row.status,
    episodes_watched: row.episodes_watched,
    current_season: row.current_season,
    current_episode: row.current_episode,
    user_rating: row.user_rating || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    title: {
      id: row.title_id,
      tmdb_id: row.tmdb_id,
      media_type: row.media_type,
      name: row.name,
      genres: row.genres,
      release_date: row.release_date,
      poster_path: row.poster_path,
      backdrop_path: row.backdrop_path,
      overview: row.overview,
      tmdb_rating: row.tmdb_rating ? parseFloat(row.tmdb_rating) : 0,
      total_episodes: row.total_episodes
    }
  };
}

// GET /api/tracker - current user's tracked titles
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { status, media_type, sort_by } = req.query;

    let sql = `
      SELECT 
        te.id,
        te.user_id,
        te.title_id,
        te.status,
        te.episodes_watched,
        te.current_season,
        te.current_episode,
        te.created_at,
        te.updated_at,
        t.tmdb_id,
        t.media_type,
        t.name,
        t.genres,
        t.release_date,
        t.poster_path,
        t.backdrop_path,
        t.overview,
        t.tmdb_rating,
        t.total_episodes,
        r.rating AS user_rating
      FROM tracker_entries te
      JOIN titles t ON te.title_id = t.id
      LEFT JOIN ratings r ON r.user_id = te.user_id AND r.title_id = te.title_id
      WHERE te.user_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      sql += ' AND te.status = ?';
      params.push(status);
    }

    if (media_type && media_type !== 'all' && ['movie', 'tv'].includes(media_type)) {
      sql += ' AND t.media_type = ?';
      params.push(media_type);
    }

    // Sorting
    if (sort_by === 'name_asc') {
      sql += ' ORDER BY t.name ASC';
    } else if (sort_by === 'rating_desc') {
      sql += ' ORDER BY COALESCE(r.rating, t.tmdb_rating) DESC';
    } else if (sort_by === 'oldest') {
      sql += ' ORDER BY te.updated_at ASC';
    } else {
      sql += ' ORDER BY te.updated_at DESC';
    }

    const [rows] = await pool.query(sql, params);
    const results = rows.map(formatEntryRow);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

// POST /api/tracker - add or upsert title in user's tracker
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const {
      tmdb_id,
      media_type,
      name,
      genres,
      release_date,
      poster_path,
      backdrop_path,
      overview,
      tmdb_rating,
      total_episodes,
      status = 'plan_to_watch',
      episodes_watched = 0,
      current_season = 1,
      current_episode = 0
    } = req.body;

    if (!tmdb_id || !media_type || !name) {
      return res.status(400).json({ error: 'tmdb_id, media_type, and name are required' });
    }

    const chosenStatus = VALID_STATUSES.includes(status) ? status : 'plan_to_watch';

    // Ensure title exists locally
    const titleRecord = await upsertTitle({
      tmdb_id,
      media_type,
      name,
      genres,
      release_date,
      poster_path,
      backdrop_path,
      overview,
      tmdb_rating,
      total_episodes
    });

    // Upsert tracker entry for user
    const insertSql = `
      INSERT INTO tracker_entries (
        user_id, title_id, status, episodes_watched, current_season, current_episode
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await pool.query(insertSql, [
      userId,
      titleRecord.id,
      chosenStatus,
      media_type === 'movie' ? 0 : Math.max(0, episodes_watched),
      current_season,
      current_episode
    ]);

    const [existing] = await pool.query(
      'SELECT id FROM tracker_entries WHERE user_id = ? AND title_id = ? LIMIT 1',
      [userId, titleRecord.id]
    );

    const fullEntry = await getTrackerEntryById(existing[0].id, userId);
    res.status(201).json(fullEntry);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tracker/:id/status - update status
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const entryId = req.params.id;
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    // Check entry exists & owned
    const [existing] = await pool.query(
      `SELECT te.*, t.total_episodes, t.media_type
       FROM tracker_entries te
       JOIN titles t ON te.title_id = t.id
       WHERE te.id = ? AND te.user_id = ? LIMIT 1`,
      [entryId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tracker entry not found' });
    }

    const item = existing[0];
    let newEpisodesWatched = item.episodes_watched;

    // If marked completed and total_episodes is known, set episodes_watched to total
    if (status === 'completed' && item.media_type === 'tv' && item.total_episodes) {
      newEpisodesWatched = item.total_episodes;
    }

    await pool.query(
      'UPDATE tracker_entries SET status = ?, episodes_watched = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, newEpisodesWatched, entryId, userId]
    );

    const updated = await getTrackerEntryById(entryId, userId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tracker/:id/progress - update manual episode progress
router.patch('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const entryId = req.params.id;
    const { delta, episodes_watched, current_season, current_episode } = req.body;

    // Check entry and title
    const [existing] = await pool.query(
      `SELECT te.*, t.total_episodes, t.media_type 
       FROM tracker_entries te 
       JOIN titles t ON te.title_id = t.id 
       WHERE te.id = ? AND te.user_id = ? LIMIT 1`,
      [entryId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tracker entry not found' });
    }

    const item = existing[0];

    // Movies do not have episodes
    if (item.media_type === 'movie') {
      return res.status(400).json({ error: 'Movies do not support episode progress' });
    }

    let targetWatched = item.episodes_watched;

    if (typeof delta === 'number') {
      targetWatched += delta;
    } else if (typeof episodes_watched === 'number') {
      targetWatched = episodes_watched;
    }

    // Lower bound: cannot be negative
    if (targetWatched < 0) {
      targetWatched = 0;
    }

    // Upper bound: cannot exceed known total_episodes
    if (item.total_episodes && item.total_episodes > 0) {
      if (targetWatched > item.total_episodes) {
        targetWatched = item.total_episodes;
      }
    }

    // Update status automatically if reaches completion or starts watching
    let updatedStatus = item.status;
    if (item.total_episodes && targetWatched >= item.total_episodes) {
      updatedStatus = 'completed';
    } else if (targetWatched > 0 && item.status === 'plan_to_watch') {
      updatedStatus = 'watching';
    }

    const newSeason = typeof current_season === 'number' && current_season >= 1
      ? current_season
      : item.current_season;
    
    const newEpisode = typeof current_episode === 'number' && current_episode >= 0
      ? current_episode
      : (typeof delta === 'number' ? Math.max(0, item.current_episode + delta) : item.current_episode);

    await pool.query(
      `UPDATE tracker_entries 
       SET episodes_watched = ?, current_season = ?, current_episode = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [targetWatched, newSeason, newEpisode, updatedStatus, entryId, userId]
    );

    const updated = await getTrackerEntryById(entryId, userId);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tracker/:id - remove from tracker
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const entryId = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM tracker_entries WHERE id = ? AND user_id = ?',
      [entryId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tracker entry not found' });
    }

    res.json({ message: 'Title removed from your tracker', id: parseInt(entryId, 10) });
  } catch (error) {
    next(error);
  }
});

export default router;
