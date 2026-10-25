const { validationResult } = require('express-validator');
const { pool } = require('../config/database');

function validate(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(422).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  return true;
}

async function listArtists(req, res, next) {
  try {
    const userId = req.user?.id || 0;
    const search = String(req.query.search || '').trim();
    const like = `%${search}%`;
    const [artists] = await pool.execute(
      `SELECT a.id, a.artist_name AS artistName, a.bio, a.genre, a.location,
              a.profile_image AS profileImage, a.verified,
              COUNT(DISTINCT f.id) AS followerCount,
              COUNT(DISTINCT s.id) AS songCount,
              (SELECT COUNT(*) > 0 FROM follows WHERE artist_id = a.id AND follower_id = ?) AS isFollowing
       FROM artists a
       LEFT JOIN follows f ON f.artist_id = a.id
       LEFT JOIN songs s ON s.artist_id = a.id AND s.status = 'approved'
       WHERE (? = '' OR a.artist_name LIKE ? OR a.genre LIKE ?)
       GROUP BY a.id
       ORDER BY followerCount DESC, a.artist_name ASC`,
      [userId, search, like, like],
    );
    return res.json({
      success: true,
      data: {
        artists: artists.map((a) => ({
          ...a,
          isFollowing: Boolean(a.isFollowing),
          followerCount: Number(a.followerCount || 0),
          songCount: Number(a.songCount || 0),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getArtist(req, res, next) {
  try {
    const userId = req.user?.id || 0;
    const [artists] = await pool.execute(
      `SELECT a.id, a.user_id AS userId, a.artist_name AS artistName, a.bio, a.genre,
              a.location, a.profile_image AS profileImage, a.verified,
              COUNT(DISTINCT f.id) AS followerCount,
              (SELECT COUNT(*) > 0 FROM follows WHERE artist_id = a.id AND follower_id = ?) AS isFollowing
       FROM artists a
       LEFT JOIN follows f ON f.artist_id = a.id
       WHERE a.id = ?
       GROUP BY a.id`,
      [userId, req.params.id],
    );
    if (artists.length === 0) return res.status(404).json({ success: false, message: 'Artist not found.' });

    const [songs] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.genre, s.audio_url AS audioUrl,
              s.cover_image AS coverImage, s.duration, s.play_count AS playCount,
              al.title AS albumTitle,
              (SELECT COUNT(*) FROM likes WHERE song_id = s.id) AS likeCount,
              (SELECT COUNT(*) > 0 FROM likes WHERE song_id = s.id AND user_id = ?) AS isLiked
       FROM songs s
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE s.artist_id = ? AND s.status = 'approved'
       ORDER BY s.play_count DESC, s.created_at DESC`,
      [userId, req.params.id],
    );
    const [albums] = await pool.execute(
      `SELECT id, title, description, cover_image AS coverImage, release_date AS releaseDate
       FROM albums WHERE artist_id = ? ORDER BY release_date DESC, created_at DESC`,
      [req.params.id],
    );

    const artist = {
      ...artists[0],
      isFollowing: Boolean(artists[0].isFollowing),
      followerCount: Number(artists[0].followerCount || 0),
    };

    return res.json({
      success: true,
      data: {
        artist,
        songs: songs.map((s) => ({
          ...s,
          isLiked: Boolean(s.isLiked),
          likeCount: Number(s.likeCount || 0),
        })),
        albums,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updateOwnArtist(req, res, next) {
  if (validate(req, res)) return;
  try {
    const profileImage = req.file ? `/uploads/profiles/${req.file.filename}` : undefined;
    let query;
    let params;

    if (profileImage) {
      query = `UPDATE artists SET artist_name = ?, bio = ?, genre = ?, location = ?, profile_image = ?
               WHERE user_id = ?`;
      params = [req.body.artistName, req.body.bio || null, req.body.genre || null, req.body.location || null, profileImage, req.user.id];
    } else {
      query = `UPDATE artists SET artist_name = ?, bio = ?, genre = ?, location = ?
               WHERE user_id = ?`;
      params = [req.body.artistName, req.body.bio || null, req.body.genre || null, req.body.location || null, req.user.id];
    }

    const [result] = await pool.execute(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Artist profile not found.' });

    if (profileImage) {
      await pool.execute('UPDATE users SET profile_image = ? WHERE id = ?', [profileImage, req.user.id]);
    }

    return res.json({
      success: true,
      message: 'Artist profile updated.',
      data: { profileImage: profileImage || null },
    });
  } catch (error) {
    return next(error);
  }
}

async function followArtist(req, res, next) {
  try {
    const artistId = Number(req.params.id);
    const [artists] = await pool.execute('SELECT id, user_id FROM artists WHERE id = ?', [artistId]);
    if (artists.length === 0) {
      return res.status(404).json({ success: false, message: 'Artist not found.' });
    }

    if (artists[0].user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot follow your own artist profile.' });
    }

    await pool.execute(
      'INSERT IGNORE INTO follows (follower_id, artist_id) VALUES (?, ?)',
      [req.user.id, artistId],
    );

    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS followerCount FROM follows WHERE artist_id = ?',
      [artistId],
    );

    return res.json({
      success: true,
      message: 'You are now following this artist.',
      data: {
        artistId,
        following: true,
        followerCount: Number(countRow.followerCount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function unfollowArtist(req, res, next) {
  try {
    const artistId = Number(req.params.id);
    await pool.execute(
      'DELETE FROM follows WHERE follower_id = ? AND artist_id = ?',
      [req.user.id, artistId],
    );

    const [[countRow]] = await pool.execute(
      'SELECT COUNT(*) AS followerCount FROM follows WHERE artist_id = ?',
      [artistId],
    );

    return res.json({
      success: true,
      message: 'You have unfollowed this artist.',
      data: {
        artistId,
        following: false,
        followerCount: Number(countRow.followerCount),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getFollowedArtists(req, res, next) {
  try {
    const [artists] = await pool.execute(
      `SELECT a.id, a.user_id AS userId, a.artist_name AS artistName, a.bio, a.genre,
              a.location, a.profile_image AS profileImage, a.verified, f.created_at AS followedAt,
              COUNT(DISTINCT all_f.id) AS followerCount,
              COUNT(DISTINCT s.id) AS songCount,
              1 AS isFollowing
       FROM follows f
       JOIN artists a ON a.id = f.artist_id
       LEFT JOIN follows all_f ON all_f.artist_id = a.id
       LEFT JOIN songs s ON s.artist_id = a.id AND s.status = 'approved'
       WHERE f.follower_id = ?
       GROUP BY a.id, f.created_at
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );

    return res.json({
      success: true,
      data: {
        artists: artists.map((a) => ({
          ...a,
          isFollowing: true,
          followerCount: Number(a.followerCount),
          songCount: Number(a.songCount),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getOwnDashboard(req, res, next) {
  try {
    const userId = req.user?.id;
    // Get artist profile
    const [artists] = await pool.execute(
      `SELECT a.id, a.user_id AS userId, a.artist_name AS artistName, a.bio, a.genre, a.location, a.profile_image AS profileImage, a.verified,
              COUNT(DISTINCT f.id) AS followerCount
       FROM artists a
       LEFT JOIN follows f ON f.artist_id = a.id
       WHERE a.user_id = ?
       GROUP BY a.id`,
      [userId]
    );
    if (artists.length === 0) return res.status(404).json({ success: false, message: 'Artist profile not found.' });
    const artist = artists[0];
    // Aggregate song stats for this artist
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(*) AS totalSongs,
         SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) AS approvedSongs,
         SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END) AS pendingSongs,
         SUM(s.play_count) AS totalPlays,
         SUM(likeCounts.likeCount) AS totalLikes
       FROM songs s
       LEFT JOIN (
         SELECT song_id, COUNT(*) AS likeCount FROM likes GROUP BY song_id
       ) likeCounts ON likeCounts.song_id = s.id
       WHERE s.artist_id = ?`,
      [artist.id]
    );
    const dashboard = {
      ...artist,
      followerCount: Number(artist.followerCount || 0),
      totalSongs: Number(stats[0].totalSongs || 0),
      approvedSongs: Number(stats[0].approvedSongs || 0),
      pendingSongs: Number(stats[0].pendingSongs || 0),
      totalPlays: Number(stats[0].totalPlays || 0),
      totalLikes: Number(stats[0].totalLikes || 0),
    };
    return res.json({ success: true, data: { dashboard } });
  } catch (error) {
    return next(error);
  }
}
module.exports = {
  listArtists,
  getArtist,
  updateOwnArtist,
  followArtist,
  unfollowArtist,
  getFollowedArtists,
  getOwnDashboard,
};

