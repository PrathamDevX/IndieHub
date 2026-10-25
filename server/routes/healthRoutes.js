const express = require('express');
const { checkDatabaseConnection } = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    await checkDatabaseConnection();
    res.json({
      success: true,
      service: 'IndieHub API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Database health check failed:', error.code || error.message);
    return res.status(503).json({
      success: false,
      message: 'Database is unavailable. Check the MySQL service and server environment variables.',
    });
  }
});

module.exports = router;
