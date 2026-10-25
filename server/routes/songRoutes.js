const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const optionalAuth = require('../middleware/optionalAuth');
const authorizeRole = require('../middleware/authorizeRole');
const { songUpload } = require('../middleware/upload');
const {
  listSongs,
  getSong,
  createSong,
  incrementPlayCount,
  likeSong,
  unlikeSong,
  getLikedSongs,
} = require('../controllers/songController');
const {
  getSongComments,
  createSongComment,
} = require('../controllers/commentController');

const router = express.Router();

router.get('/liked', authenticateUser, getLikedSongs);
router.get('/', optionalAuth, listSongs);
router.get('/:id', optionalAuth, getSong);
router.get('/:id/comments', optionalAuth, getSongComments);

router.post(
  '/',
  authenticateUser,
  authorizeRole('artist'),
  songUpload,
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Song title is required.'),
  ],
  createSong,
);

router.post(
  '/:id/comments',
  authenticateUser,
  [
    body('comment')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters.'),
  ],
  createSongComment,
);

router.post('/:id/play', incrementPlayCount);
router.post('/:id/like', authenticateUser, likeSong);
router.delete('/:id/like', authenticateUser, unlikeSong);

module.exports = router;

