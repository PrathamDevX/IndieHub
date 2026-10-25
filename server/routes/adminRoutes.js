const express = require('express');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRole = require('../middleware/authorizeRole');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// Enforce admin-only authorization on all /api/admin routes
router.use(authenticateUser, authorizeRole('admin'));

// Platform Stats
router.get('/stats', getStats);

// Song Moderation
router.get('/songs/pending', getPendingSongs);
router.put('/songs/:id/approve', approveSong);
router.put('/songs/:id/reject', rejectSong);
router.delete('/songs/:id', deleteSong);

// User Management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Artist Management
router.get('/artists', getArtists);
router.put('/artists/:id/verify', verifyArtist);

module.exports = router;
