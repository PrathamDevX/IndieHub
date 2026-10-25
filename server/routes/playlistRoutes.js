const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const optionalAuth = require('../middleware/optionalAuth');
const {
  createPlaylist,
  getMyPlaylists,
  listPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} = require('../controllers/playlistController');

const router = express.Router();

router.get('/my', authenticateUser, getMyPlaylists);
router.get('/', optionalAuth, listPlaylists);
router.get('/:id', optionalAuth, getPlaylist);

router.post(
  '/',
  authenticateUser,
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Playlist name is required (1-150 characters).'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be 500 characters or less.'),
  ],
  createPlaylist,
);

router.put(
  '/:id',
  authenticateUser,
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Playlist name is required (1-150 characters).'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be 500 characters or less.'),
  ],
  updatePlaylist,
);

router.delete('/:id', authenticateUser, deletePlaylist);

router.post(
  '/:id/songs',
  authenticateUser,
  [
    body('songId').isInt({ min: 1 }).withMessage('A valid songId is required.'),
  ],
  addSongToPlaylist,
);

router.delete('/:id/songs/:songId', authenticateUser, removeSongFromPlaylist);

module.exports = router;
