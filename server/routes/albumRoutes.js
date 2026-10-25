const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const authorizeRole = require('../middleware/authorizeRole');
const { listAlbums, createAlbum } = require('../controllers/albumController');

const router = express.Router();
router.get('/', listAlbums);
router.post('/', authenticateUser, authorizeRole('artist'), [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Album title is required.'),
  body('releaseDate').optional().isISO8601().withMessage('Release date must be valid.'),
], createAlbum);

module.exports = router;
