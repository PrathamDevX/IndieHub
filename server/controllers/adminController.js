const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

/**
 * Platform statistics:
 * Users, Artists, Songs (by status), and Total Plays.
 */
async function getStats(req, res, next) {
  try {
    const [[usersRow]] = await pool.execute('SELECT COUNT(*) AS totalUsers FROM users');
    const [[artistsRow]] = await pool.execute('SELECT COUNT(*) AS totalArtists, SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verifiedArtists FROM artists');
    const [[songsRow]] = await pool.execute(`
      SELECT
        COUNT(*) AS totalSongs,
        COALESCE(SUM(play_count), 0) AS totalPlays,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingSongs,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedSongs,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedSongs
      FROM songs
    `);

    return res.json({
      success: true,
      data: {
        stats: {
          totalUsers: Number(usersRow.totalUsers || 0),
          totalArtists: Number(artistsRow.totalArtists || 0),
          verifiedArtists: Number(artistsRow.verifiedArtists || 0),
          totalSongs: Number(songsRow.totalSongs || 0),
          totalPlays: Number(songsRow.totalPlays || 0),
          pendingSongs: Number(songsRow.pendingSongs || 0),
          approvedSongs: Number(songsRow.approvedSongs || 0),
          rejectedSongs: Number(songsRow.rejectedSongs || 0),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all pending songs awaiting moderation.
 */
async function getPendingSongs(req, res, next) {
  try {
    const [songs] = await pool.execute(`
      SELECT
        s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
        s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
        s.status, s.created_at AS createdAt,
        a.id AS artistId, a.artist_name AS artistName, a.verified AS artistVerified,
        al.id AS albumId, al.title AS albumTitle
      FROM songs s
      JOIN artists a ON a.id = s.artist_id
      LEFT JOIN albums al ON al.id = s.album_id
      WHERE s.status = 'pending'
      ORDER BY s.created_at ASC
    `);

    return res.json({
      success: true,
      data: { songs },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Approve a song (status = 'approved').
 */
async function approveSong(req, res, next) {
  try {
    const [result] = await pool.execute(
      'UPDATE songs SET status = ? WHERE id = ?',
      ['approved', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    return res.json({
      success: true,
      message: 'Song has been approved.',
      data: { songId: Number(req.params.id), status: 'approved' },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Reject a song (status = 'rejected').
 */
async function rejectSong(req, res, next) {
  try {
    const [result] = await pool.execute(
      'UPDATE songs SET status = ? WHERE id = ?',
      ['rejected', req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    return res.json({
      success: true,
      message: 'Song has been rejected.',
      data: { songId: Number(req.params.id), status: 'rejected' },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a song permanently.
 */
async function deleteSong(req, res, next) {
  try {
    const [songs] = await pool.execute('SELECT audio_url, cover_image FROM songs WHERE id = ?', [req.params.id]);
    if (songs.length === 0) {
      return res.status(404).json({ success: false, message: 'Song not found.' });
    }

    const song = songs[0];
    await pool.execute('DELETE FROM songs WHERE id = ?', [req.params.id]);

    // Safely remove files from disk if present
    const uploadRoot = path.resolve(__dirname, '..');
    if (song.audio_url && song.audio_url.startsWith('/uploads/')) {
      const audioPath = path.join(uploadRoot, song.audio_url);
      if (fs.existsSync(audioPath)) fs.unlink(audioPath, () => {});
    }
    if (song.cover_image && song.cover_image.startsWith('/uploads/')) {
      const coverPath = path.join(uploadRoot, song.cover_image);
      if (fs.existsSync(coverPath)) fs.unlink(coverPath, () => {});
    }

    return res.json({
      success: true,
      message: 'Song deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all users with artist metadata and filter by search/role.
 */
async function getUsers(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const like = `%${search}%`;

    const [users] = await pool.execute(
      `SELECT
         u.id, u.name, u.email, u.role, u.status, u.profile_image AS profileImage,
         u.created_at AS createdAt,
         a.id AS artistId, a.artist_name AS artistName, a.verified AS artistVerified
       FROM users u
       LEFT JOIN artists a ON a.user_id = u.id
       WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?)
         AND (? = '' OR u.role = ?)
       ORDER BY u.created_at DESC`,
      [search, like, like, role, role]
    );

    return res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Suspend or activate a user account.
 */
async function updateUserStatus(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(422).json({ success: false, message: 'Status must be active or suspended.' });
    }

    if (req.user.id === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot change your own admin account status.' });
    }

    const [result] = await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: `User account has been ${status === 'suspended' ? 'suspended' : 'activated'}.`,
      data: { userId: targetId, status },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Delete a user account (cascades to artist, albums, songs, playlists, likes).
 */
async function deleteUser(req, res, next) {
  try {
    const targetId = Number(req.params.id);

    if (req.user.id === targetId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [targetId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      message: 'User account deleted successfully.',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * List all artists with song & follower counts.
 */
async function getArtists(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    const like = `%${search}%`;

    const [artists] = await pool.execute(
      `SELECT
         a.id, a.user_id AS userId, a.artist_name AS artistName, a.bio, a.genre,
         a.location, a.profile_image AS profileImage, a.verified, a.created_at AS createdAt,
         u.email, u.status AS userStatus,
         COUNT(DISTINCT s.id) AS songCount,
         COUNT(DISTINCT f.id) AS followerCount
       FROM artists a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN songs s ON s.artist_id = a.id
       LEFT JOIN follows f ON f.artist_id = a.id
       WHERE (? = '' OR a.artist_name LIKE ? OR a.genre LIKE ? OR u.email LIKE ?)
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [search, like, like, like]
    );

    return res.json({
      success: true,
      data: { artists },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Verify / unverify an artist.
 */
async function verifyArtist(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    let verified = req.body.verified;

    if (typeof verified !== 'boolean') {
      // Toggle if not explicitly provided
      const [curr] = await pool.execute('SELECT verified FROM artists WHERE id = ?', [targetId]);
      if (curr.length === 0) return res.status(404).json({ success: false, message: 'Artist not found.' });
      verified = !curr[0].verified;
    }

    const [result] = await pool.execute(
      'UPDATE artists SET verified = ? WHERE id = ?',
      [verified ? 1 : 0, targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Artist not found.' });
    }

    return res.json({
      success: true,
      message: `Artist ${verified ? 'verified' : 'unverified'} successfully.`,
      data: { artistId: targetId, verified },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStats,
  getPendingSongs,
  approveSong,
  rejectSong,
  deleteSong,
  getUsers,
  updateUserStatus,
  deleteUser,
  getArtists,
  verifyArtist,
};
