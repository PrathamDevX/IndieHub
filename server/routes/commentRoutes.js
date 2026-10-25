const express = require('express');
const { body } = require('express-validator');
const authenticateUser = require('../middleware/authenticateUser');
const { updateComment, deleteComment } = require('../controllers/commentController');

const router = express.Router();

router.put(
  '/:id',
  authenticateUser,
  [
    body('comment')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Comment must be between 1 and 1000 characters.'),
  ],
  updateComment,
);

router.delete('/:id', authenticateUser, deleteComment);

module.exports = router;
