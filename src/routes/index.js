const express = require('express');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const inspiraRoutes = require('./inspira');
const aduSwaraRoutes = require('./aduSwara');
const podiumRoutes = require('./podium');
const skorSwaraRoutes = require('./skorSwara');
const mentoringRoutes = require('./mentoring');
const basicTrainingRoutes = require('./basicTraining');
const mentorRoutes = require('./mentor');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/inspira-swara', inspiraRoutes);
router.use('/adu-swara', aduSwaraRoutes);
router.use('/podium', podiumRoutes);
router.use('/skor-swara', skorSwaraRoutes);
router.use('/latih-swara', mentoringRoutes);
router.use('/basic-training', basicTrainingRoutes);
router.use('/mentor', mentorRoutes)

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;