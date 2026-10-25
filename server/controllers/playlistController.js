const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
}

async function createPlaylist(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const { name, description } = req.body;
    const [result] = await pool.execute(
      `INSERT INTO playlists (user_id, name, description)
       VALUES (?, ?, ?)`,
      [req.user.id, name.trim(), description ? description.trim() : null],
    );

    return res.status(201).json({
      success: true,
      message: 'Playlist created successfully.',
      data: {
        playlistId: result.insertId,
        name: name.trim(),
        description: description ? description.trim() : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyPlaylists(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.user_id AS userId, p.name, p.description, p.cover_image AS coverImage,
              p.created_at AS createdAt,
              COUNT(ps.song_id) AS songCount,
              (SELECT s.cover_image
               FROM playlist_songs ps2
               JOIN songs s ON s.id = ps2.song_id
               WHERE ps2.playlist_id = p.id AND s.cover_image IS NOT NULL
               LIMIT 1) AS firstSongCover
       FROM playlists p
       LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );

    const playlists = rows.map((p) => ({
      ...p,
      songCount: Number(p.songCount || 0),
      coverImage: p.coverImage || p.firstSongCover || null,
    }));

    return res.json({ success: true, data: { playlists } });
  } catch (error) {
    return next(error);
  }
}

async function listPlaylists(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const like = `%${search}%`;

    const [rows] = await pool.execute(
      `SELECT p.id, p.user_id AS userId, p.name, p.description, p.cover_image AS coverImage,
              p.created_at AS createdAt, u.name AS userName,
              COUNT(ps.song_id) AS songCount,
              (SELECT s.cover_image
               FROM playlist_songs ps2
               JOIN songs s ON s.id = ps2.song_id
               WHERE ps2.playlist_id = p.id AND s.cover_image IS NOT NULL
               LIMIT 1) AS firstSongCover
       FROM playlists p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN playlist_songs ps ON ps.playlist_id = p.id
       WHERE (? = '' OR p.name LIKE ? OR u.name LIKE ?)
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [search, like, like],
    );

    const playlists = rows.map((p) => ({
      ...p,
      songCount: Number(p.songCount || 0),
      coverImage: p.coverImage || p.firstSongCover || null,
    }));

    return res.json({ success: true, data: { playlists } });
  } catch (error) {
    return next(error);
  }
}

async function getPlaylist(req, res, next) {
  try {
    const playlistId = Number(req.params.id);
    const userId = req.user?.id || 0;

    const [playlists] = await pool.execute(
      `SELECT p.id, p.user_id AS userId, p.name, p.description, p.cover_image AS coverImage,
              p.created_at AS createdAt, u.name AS userName
       FROM playlists p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [playlistId],
    );

    if (playlists.length === 0) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    const playlist = playlists[0];

    const [songs] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
              s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
              ps.added_at AS addedAt,
              a.id AS artistId, a.artist_name AS artistName,
              al.id AS albumId, al.title AS albumTitle,
              (SELECT COUNT(*) FROM likes WHERE song_id = s.id) AS likeCount,
              (SELECT COUNT(*) > 0 FROM likes WHERE song_id = s.id AND user_id = ?) AS isLiked
       FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       JOIN artists a ON a.id = s.artist_id
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE ps.playlist_id = ? AND s.status = 'approved'
       ORDER BY ps.added_at ASC`,
      [userId, playlistId],
    );

    const formattedSongs = songs.map((s) => ({
      ...s,
      isLiked: Boolean(s.isLiked),
      likeCount: Number(s.likeCount || 0),
    }));

    const resolvedCover = playlist.coverImage || formattedSongs.find((s) => s.coverImage)?.coverImage || null;

    return res.json({
      success: true,
      data: {
        playlist: {
          ...playlist,
          coverImage: resolvedCover,
          isOwner: userId === playlist.userId,
          songCount: formattedSongs.length,
          songs: formattedSongs,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePlaylist(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const playlistId = Number(req.params.id);
    const [playlists] = await pool.execute(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId],
    );

    if (playlists.length === 0) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    if (playlists[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to edit this playlist.' });
    }

    const { name, description } = req.body;
    await pool.execute(
      'UPDATE playlists SET name = ?, description = ? WHERE id = ?',
      [name.trim(), description !== undefined ? description.trim() : null, playlistId],
    );

    return res.json({
      success: true,
      message: 'Playlist updated successfully.',
      data: { playlistId, name: name.trim(), description: description ? description.trim() : null },
    });
  } catch (error) {
    return next(error);
  }
}

async function deletePlaylist(req, res, next) {
  try {
    const playlistId = Number(req.params.id);
    const [playlists] = await pool.execute(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId],
    );

    if (playlists.length === 0) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    if (playlists[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this playlist.' });
    }

    await pool.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);

    return res.json({ success: true, message: 'Playlist deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

async function addSongToPlaylist(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const playlistId = Number(req.params.id);
    const songId = Number(req.body.songId);

    const [playlists] = await pool.execute(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId],
    );

    if (playlists.length === 0) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    if (playlists[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this playlist.' });
    }

    const [songs] = await pool.execute(
      'SELECT id, title FROM songs WHERE id = ? AND status = "approved"',
      [songId],
    );

    if (songs.length === 0) {
      return res.status(404).json({ success: false, message: 'Song not found or not approved.' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId],
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Song is already in this playlist.' });
    }

    await pool.execute(
      'INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
      [playlistId, songId],
    );

    return res.status(201).json({
      success: true,
      message: 'Song added to playlist.',
      data: { playlistId, songId },
    });
  } catch (error) {
    return next(error);
  }
}

async function removeSongFromPlaylist(req, res, next) {
  try {
    const playlistId = Number(req.params.id);
    const songId = Number(req.params.songId);

    const [playlists] = await pool.execute(
      'SELECT id, user_id FROM playlists WHERE id = ?',
      [playlistId],
    );

    if (playlists.length === 0) {
      return res.status(404).json({ success: false, message: 'Playlist not found.' });
    }

    if (playlists[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You do not own this playlist.' });
    }

    const [result] = await pool.execute(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Song not found in playlist.' });
    }

    return res.json({ success: true, message: 'Song removed from playlist.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPlaylist,
  getMyPlaylists,
  listPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
};
