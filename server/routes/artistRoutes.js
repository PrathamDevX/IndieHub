const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const optionalAuth = require('../middleware/optionalAuth');
const authorizeRole = require('../middleware/authorizeRole');
const { profileUpload } = require('../middleware/upload');
const {
  listArtists,
  getArtist,
  updateOwnArtist,
  followArtist,
  unfollowArtist,
  getFollowedArtists,
  getOwnDashboard,
} = require('../controllers/artistController');

const router = express.Router();

router.get('/followed', authenticateUser, getFollowedArtists);
router.get('/me/dashboard', authenticateUser, authorizeRole('artist'), getOwnDashboard);
router.get('/', optionalAuth, listArtists);
router.get('/:id', optionalAuth, getArtist);

router.post('/:id/follow', authenticateUser, followArtist);
router.delete('/:id/follow', authenticateUser, unfollowArtist);

router.put(
  '/me',
  authenticateUser,
  authorizeRole('artist'),
  profileUpload,
  [
    body('artistName').trim().isLength({ min: 2, max: 150 }).withMessage('Artist name is required.'),
    body('bio').optional().isLength({ max: 2000 }).withMessage('Bio is too long.'),
  ],
  updateOwnArtist,
);

module.exports = router;

