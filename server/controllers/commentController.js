const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
}

async function getSongComments(req, res, next) {
  try {
    const songId = Number(req.params.id);
    const userId = req.user?.id || 0;

    const [songs] = await pool.execute(
      'SELECT id FROM songs WHERE id = ? AND status = "approved"',
      [songId],
    );

    if (songs.length === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const [comments] = await pool.execute(
      `SELECT c.id, c.song_id AS songId, c.comment, c.created_at AS createdAt, c.updated_at AS updatedAt,
              u.id AS userId, u.name AS userName, u.profile_image AS userAvatar, u.role AS userRole
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.song_id = ?
       ORDER BY c.created_at DESC`,
      [songId],
    );

    const formattedComments = comments.map((c) => ({
      ...c,
      isAuthor: userId === c.userId || req.user?.role === 'admin',
    }));

    return res.json({
      success: true,
      data: {
        comments: formattedComments,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function createSongComment(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const songId = Number(req.params.id);
    const text = req.body.comment.trim();

    const [songs] = await pool.execute(
      'SELECT id FROM songs WHERE id = ? AND status = "approved"',
      [songId],
    );

    if (songs.length === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO comments (user_id, song_id, comment) VALUES (?, ?, ?)',
      [req.user.id, songId, text],
    );

    const [[newComment]] = await pool.execute(
      `SELECT c.id, c.song_id AS songId, c.comment, c.created_at AS createdAt, c.updated_at AS updatedAt,
              u.id AS userId, u.name AS userName, u.profile_image AS userAvatar, u.role AS userRole
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: 'Comment posted.',
      data: {
        comment: {
          ...newComment,
          isAuthor: true,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateComment(req, res, next) {
  if (invalid(req, res)) return;
  try {
    const commentId = Number(req.params.id);
    const text = req.body.comment.trim();

    const [comments] = await pool.execute(
      'SELECT id, user_id FROM comments WHERE id = ?',
      [commentId],
    );

    if (comments.length === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    if (comments[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments.' });
    }

    await pool.execute('UPDATE comments SET comment = ? WHERE id = ?', [text, commentId]);

    const [[updated]] = await pool.execute(
      `SELECT c.id, c.song_id AS songId, c.comment, c.created_at AS createdAt, c.updated_at AS updatedAt,
              u.id AS userId, u.name AS userName, u.profile_image AS userAvatar, u.role AS userRole
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [commentId],
    );

    return res.json({
      success: true,
      message: 'Comment updated.',
      data: {
        comment: {
          ...updated,
          isAuthor: true,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.id);

    const [comments] = await pool.execute(
      'SELECT id, user_id FROM comments WHERE id = ?',
      [commentId],
    );

    if (comments.length === 0) {
      return res.status(404).json({ success: false, message: 'Comment not found.' });
    }

    if (comments[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own comments.' });
    }

    await pool.execute('DELETE FROM comments WHERE id = ?', [commentId]);

    return res.json({ success: true, message: 'Comment deleted successfully.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSongComments,
  createSongComment,
  updateComment,
  deleteComment,
};
