import pool from '../config/db.js';

export async function upsertTitle(payload) {
  const {
    tmdb_id,
    media_type,
    name,
    genres = '',
    release_date = '',
    poster_path = null,
    backdrop_path = null,
    overview = '',
    tmdb_rating = 0.0,
    total_episodes = null
  } = payload;

  if (!tmdb_id || !media_type || !name) {
    throw new Error('tmdb_id, media_type, and name are required to upsert a title.');
  }

  const query = `
    INSERT INTO titles (
      tmdb_id, media_type, name, genres, release_date,
      poster_path, backdrop_path, overview, tmdb_rating, total_episodes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      genres = VALUES(genres),
      release_date = VALUES(release_date),
      poster_path = VALUES(poster_path),
      backdrop_path = VALUES(backdrop_path),
      overview = VALUES(overview),
      tmdb_rating = VALUES(tmdb_rating),
      total_episodes = COALESCE(VALUES(total_episodes), total_episodes),
      updated_at = CURRENT_TIMESTAMP
  `;

  await pool.query(query, [
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
  ]);

  // Retrieve the title ID
  const [rows] = await pool.query(
    'SELECT * FROM titles WHERE tmdb_id = ? AND media_type = ? LIMIT 1',
    [tmdb_id, media_type]
  );

  return rows[0];
}

export default { upsertTitle };
