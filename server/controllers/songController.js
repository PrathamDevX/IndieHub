const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
}

async function listSongs(req, res, next) {
  try {
    const userId = req.user?.id || 0;
    const search = String(req.query.search || '').trim();
    const genre = String(req.query.genre || '').trim();
    const like = `%${search}%`;
    const [songs] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
              s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
              s.created_at AS createdAt, a.id AS artistId, a.artist_name AS artistName,
              al.id AS albumId, al.title AS albumTitle,
              (SELECT COUNT(*) FROM likes WHERE song_id = s.id) AS likeCount,
              (SELECT COUNT(*) > 0 FROM likes WHERE song_id = s.id AND user_id = ?) AS isLiked,
              (SELECT COUNT(*) FROM comments WHERE song_id = s.id) AS commentCount
       FROM songs s
       JOIN artists a ON a.id = s.artist_id
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE s.status = 'approved'
         AND (? = '' OR s.title LIKE ? OR a.artist_name LIKE ?)
         AND (? = '' OR s.genre = ?)
       ORDER BY s.play_count DESC, s.created_at DESC`,
      [userId, search, like, like, genre, genre],
    );

    return res.json({
      success: true,
      data: {
        songs: songs.map((s) => ({
          ...s,
          isLiked: Boolean(s.isLiked),
          likeCount: Number(s.likeCount || 0),
          commentCount: Number(s.commentCount || 0),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getSong(req, res, next) {
  try {
    const userId = req.user?.id || 0;
    const [songs] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
              s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
              s.status, a.id AS artistId, a.artist_name AS artistName,
              al.id AS albumId, al.title AS albumTitle,
              (SELECT COUNT(*) FROM likes WHERE song_id = s.id) AS likeCount,
              (SELECT COUNT(*) > 0 FROM likes WHERE song_id = s.id AND user_id = ?) AS isLiked,
              (SELECT COUNT(*) FROM comments WHERE song_id = s.id) AS commentCount
       FROM songs s JOIN artists a ON a.id = s.artist_id
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE s.id = ? AND s.status = 'approved'`,
      [userId, req.params.id],
    );
    if (songs.length === 0) return res.status(404).json({ success: false, message: 'Song not found.' });

    const song = {
      ...songs[0],
      isLiked: Boolean(songs[0].isLiked),
      likeCount: Number(songs[0].likeCount || 0),
      commentCount: Number(songs[0].commentCount || 0),
    };

    return res.json({ success: true, data: { song } });
  } catch (error) {
    return next(error);
  }
}

async function createSong(req, res, next) {
  if (invalid(req, res)) return;
  try {
    // Ensure the logged-in user has an artist profile
    const [artists] = await pool.execute('SELECT id FROM artists WHERE user_id = ?', [req.user.id]);
    if (artists.length === 0) return res.status(403).json({ success: false, message: 'Artist profile not found.' });

    // Validate audio file was uploaded
    if (!req.files || !req.files.audio || req.files.audio.length === 0) {
      return res.status(422).json({ success: false, message: 'An audio file is required.' });
    }

    // Validate album ownership if albumId is provided
    if (req.body.albumId) {
      const [albums] = await pool.execute('SELECT id FROM albums WHERE id = ? AND artist_id = ?', [req.body.albumId, artists[0].id]);
      if (albums.length === 0) return res.status(400).json({ success: false, message: 'Album does not belong to this artist.' });
    }

    // Build file URLs relative to the static /uploads route
    const audioFile = req.files.audio[0];
    const audioUrl = `/uploads/songs/${audioFile.filename}`;

    let coverImage = null;
    if (req.files.cover && req.files.cover.length > 0) {
      const coverFile = req.files.cover[0];
      coverImage = `/uploads/covers/${coverFile.filename}`;
    }

    const [result] = await pool.execute(
      `INSERT INTO songs (artist_id, album_id, title, description, genre, audio_url, cover_image, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [artists[0].id, req.body.albumId || null, req.body.title, req.body.description || null,
        req.body.genre || null, audioUrl, coverImage, req.body.duration || null],
    );
    return res.status(201).json({
      success: true,
      message: 'Song submitted for admin approval.',
      data: { songId: result.insertId, status: 'pending' },
    });
  } catch (error) {
    return next(error);
  }
}

async function incrementPlayCount(req, res, next) {
  try {
    const [result] = await pool.execute(
      `UPDATE songs SET play_count = play_count + 1
       WHERE id = ? AND status = 'approved'`,
      [req.params.id],
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Song not found.' });
    return res.json({ success: true, message: 'Play count updated.' });
  } catch (error) {
    return next(error);
  }
}

async function likeSong(req, res, next) {
  try {
    const songId = Number(req.params.id);
    const [songs] = await pool.execute('SELECT id FROM songs WHERE id = ? AND status = "approved"', [songId]);
    if (songs.length === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    await pool.execute(
      'INSERT IGNORE INTO likes (user_id, song_id) VALUES (?, ?)',
      [req.user.id, songId]
    );

    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS likeCount FROM likes WHERE song_id = ?',
      [songId]
    );

    return res.json({
      success: true,
      message: 'Song added to your liked songs.',
      data: {
        songId,
        liked: true,
        likeCount: Number(countRow.likeCount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function unlikeSong(req, res, next) {
  try {
    const songId = Number(req.params.id);
    await pool.execute(
      'DELETE FROM likes WHERE user_id = ? AND song_id = ?',
      [req.user.id, songId]
    );

    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS likeCount FROM likes WHERE song_id = ?',
      [songId]
    );

    return res.json({
      success: true,
      message: 'Song removed from your liked songs.',
      data: {
        songId,
        liked: false,
        likeCount: Number(countRow.likeCount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getLikedSongs(req, res, next) {
  try {
    const [songs] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
              s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
              s.created_at AS createdAt, l.created_at AS likedAt,
              a.id AS artistId, a.artist_name AS artistName,
              al.id AS albumId, al.title AS albumTitle,
              (SELECT COUNT(*) FROM likes WHERE song_id = s.id) AS likeCount,
              1 AS isLiked
       FROM likes l
       JOIN songs s ON s.id = l.song_id
       JOIN artists a ON a.id = s.artist_id
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE l.user_id = ? AND s.status = 'approved'
       ORDER BY l.created_at DESC`,
      [req.user.id],
    );

    return res.json({
      success: true,
      data: {
        songs: songs.map((s) => ({
          ...s,
          isLiked: true,
          likeCount: Number(s.likeCount),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listSongs,
  getSong,
  createSong,
  incrementPlayCount,
  likeSong,
  unlikeSong,
  getLikedSongs,
};

