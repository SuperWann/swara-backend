const express = require('express');
const userRoutes = require('./users');
const inspiraRoutes = require('./inspira');
const adminRoutes = require('./admin');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/inspira-swara', inspiraRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;