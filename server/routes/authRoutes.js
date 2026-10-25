const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const { profileUpload } = require('../middleware/upload');
const { register, login, getMe, updateProfile } = require('../controllers/authController');

const router = express.Router();
const emailRule = body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail();
const passwordRule = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  emailRule,
  passwordRule,
  body('role').isIn(['listener', 'artist']).withMessage('Choose either Listener or Artist.'),
], register);
router.post('/login', [emailRule, body('password').notEmpty().withMessage('Password is required.')], login);
router.get('/me', authenticateUser, getMe);
router.put('/profile', authenticateUser, profileUpload, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
  body('bio').optional().isLength({ max: 2000 }).withMessage('Bio is too long.'),
], updateProfile);

module.exports = router;

