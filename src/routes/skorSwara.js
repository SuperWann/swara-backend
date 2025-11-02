const express = require('express');
const { body, query } = require('express-validator');
const SkorSwaraController = require('../controllers/skorSwara');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { upload } = require('../config/upload');

const router = express.Router();

const submitHasilValidation = [
  body('skor_swara_id')
    .notEmpty().withMessage('Skor Swara ID is required')
    .isInt({ min: 1 }).withMessage('Skor Swara ID must be a valid number'),
  body('kelancaran_point')
    .notEmpty().withMessage('Kelancaran point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Kelancaran point must be between 0-5'),
  body('penggunaan_bahasa_point')
    .notEmpty().withMessage('Penggunaan bahasa point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Penggunaan bahasa point must be between 0-5'),
  body('ekspresi_point')
    .notEmpty().withMessage('Ekspresi point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Ekspresi point must be between 0-5'),
  body('kelancaran_suggest')
    .notEmpty().withMessage('Kelancaran suggestion is required')
    .isString().withMessage('Kelancaran suggestion must be a string'),
  body('penggunaan_bahasa_suggest')
    .notEmpty().withMessage('Penggunaan bahasa suggestion is required')
    .isString().withMessage('Penggunaan bahasa suggestion must be a string'),
  body('ekspresi_suggest')
    .notEmpty().withMessage('Ekspresi suggestion is required')
    .isString().withMessage('Ekspresi suggestion must be a string')
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

router.use(auth);

// Start new latihan session (get random topic)
router.post('/start', SkorSwaraController.startLatihan);

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

module.exports = router;
