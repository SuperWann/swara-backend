const express = require('express');
const { body, query } = require('express-validator');
const SkorSwaraController = require('../controllers/skorSwara');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { upload } = require('../config/upload');

const router = express.Router();

const submitHasilValidation = [
  body('skor_swara_topic_id')
    .notEmpty().withMessage('Skor Swara Topic ID is required')
    .isInt({ min: 1 }).withMessage('Skor Swara Topic ID must be a valid number')
];

const startLatihanValidation = [
  body('mode_id')
    .notEmpty().withMessage('Mode ID is required')
    .isInt({ min: 1 }).withMessage('Mode ID must be a valid number'),
  body('skor_swara_topic_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Topic ID must be a valid number'),
  body('custom_topic')
    .optional()
    .isString().withMessage('Custom topic must be a string')
    .trim()
    .isLength({ min: 3, max: 500 }).withMessage('Custom topic must be between 3-500 characters')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
];

const addTopicValidation = [
  body('topic')
    .notEmpty().withMessage('Topic is required')
    .isString().withMessage('Topic must be a string')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Topic must be between 3-255 characters'),
  body('text')
    .notEmpty().withMessage('Text is required')
    .isString().withMessage('Text must be a string')
    .trim()
    .isLength({ min: 10 }).withMessage('Text must be at least 10 characters')
];

const updateTopicValidation = [
  body('topic')
    .optional()
    .isString().withMessage('Topic must be a string')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Topic must be between 3-255 characters'),
  body('text')
    .optional()
    .isString().withMessage('Text must be a string')
    .trim()
    .isLength({ min: 10 }).withMessage('Text must be at least 10 characters')
];

router.use(auth);

// Get all available modes
router.get('/modes', SkorSwaraController.getAllModes);

// Get mode detail by ID
router.get('/modes/:id', SkorSwaraController.getModeDetail);

// Start new latihan session with mode
router.post('/start', startLatihanValidation, validate, SkorSwaraController.startLatihan);

// Upload video and get AI analysis
router.post(
  '/upload', 
  upload.single('video'), 
  SkorSwaraController.uploadAndAnalyze
);

// Submit hasil latihan (from AI) -- sementara
router.post('/submit', submitHasilValidation, validate, SkorSwaraController.submitHasil);

// Get user's riwayat latihan
router.get('/riwayat', paginationValidation, validate, SkorSwaraController.getRiwayat);

// Get specific latihan detail
router.get('/detail/:id', SkorSwaraController.getDetail);

// Get all available topics
router.get('/topics', SkorSwaraController.getAllTopics);

// Add new topic
router.post('/topics', addTopicValidation, validate, SkorSwaraController.addTopic);

// Delete topic
router.delete('/topics/:id', SkorSwaraController.deleteTopic);

// Update topic
router.put('/topics/:id', updateTopicValidation, validate, SkorSwaraController.updateTopic);

module.exports = router;
