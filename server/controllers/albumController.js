const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
}

async function listAlbums(req, res, next) {
  try {
    const [albums] = await pool.execute(
      `SELECT al.id, al.title, al.description, al.cover_image AS coverImage,
              al.release_date AS releaseDate, a.id AS artistId, a.artist_name AS artistName,
              COUNT(s.id) AS songCount
       FROM albums al
       JOIN artists a ON a.id = al.artist_id
       LEFT JOIN songs s ON s.album_id = al.id AND s.status = 'approved'
       GROUP BY al.id
       ORDER BY al.release_date DESC, al.created_at DESC`,
    );
    return res.json({ success: true, data: { albums } });
  } catch (error) {
    return next(error);
  }
}

async function createAlbum(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const [artists] = await pool.execute('SELECT id FROM artists WHERE user_id = ?', [req.user.id]);
    if (artists.length === 0) return res.status(403).json({ success: false, message: 'Artist profile not found.' });
    const [result] = await pool.execute(
      `INSERT INTO albums (artist_id, title, description, cover_image, release_date)
       VALUES (?, ?, ?, ?, ?)`,
      [artists[0].id, req.body.title, req.body.description || null, req.body.coverImage || null, req.body.releaseDate || null],
    );
    return res.status(201).json({ success: true, data: { albumId: result.insertId }, message: 'Album created.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listAlbums, createAlbum };
