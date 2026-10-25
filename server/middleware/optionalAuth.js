const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

/**
 * Optional authentication: if Authorization Bearer header is present and valid,
 * attaches req.user without rejecting unauthenticated requests.
 */
function optionalAuth(req, res, next) {
  const authorization = req.get('authorization');
  const token = authorization && authorization.startsWith('Bearer ')
    ? authorization.slice(7)
    : null;

  if (!token) return next();

  try {
    req.user = jwt.verify(token, jwtSecret);
  } catch (err) {
    // Gracefully ignore token errors for optional routes
  }

  return next();
}

module.exports = optionalAuth;
