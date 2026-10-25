const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

function authenticateUser(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Your session has expired. Please log in again.' });
  }
}

module.exports = authenticateUser;
