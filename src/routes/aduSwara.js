const express = require('express');
const { body, query, param } = require('express-validator');
const AduSwaraController = require('../controllers/aduSwara');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

const topicValidation = [
  query('category_id')
    .optional()
    .isInt().withMessage('Category ID must be a number')
];

const createMatchValidation = [
  body('adu_swara_topic_id')
    .notEmpty().withMessage('Topic ID is required')
    .isInt().withMessage('Topic ID must be a number')
];

const submitResultValidation = [
  body('match_id')
    .notEmpty().withMessage('Match ID is required')
    .isInt().withMessage('Match ID must be a number'),
  body('kelancaran_point')
    .notEmpty().withMessage('Kelancaran point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Kelancaran point must be between 0-5'),
  body('penggunaan_bahasa_point')
    .notEmpty().withMessage('Penggunaan bahasa point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Penggunaan bahasa point must be between 0-5'),
  body('ekspresi_point')
    .notEmpty().withMessage('Ekspresi point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Ekspresi point must be between 0-5'),
  body('struktur_kalimat_point')
    .notEmpty().withMessage('Struktur kalimat point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Struktur kalimat point must be between 0-5'),
  body('isi_point')
    .notEmpty().withMessage('Isi point is required')
    .isInt({ min: 0, max: 5 }).withMessage('Isi point must be between 0-5'),
  body('kelancaran_suggest')
    .notEmpty().withMessage('Kelancaran suggestion is required')
    .trim(),
  body('penggunaan_bahasa_suggest')
    .notEmpty().withMessage('Penggunaan bahasa suggestion is required')
    .trim(),
  body('ekspresi_suggest')
    .notEmpty().withMessage('Ekspresi suggestion is required')
    .trim(),
  body('struktur_kalimat_suggest')
    .notEmpty().withMessage('Struktur kalimat suggestion is required')
    .trim(),
  body('isi_suggest')
    .notEmpty().withMessage('Isi suggestion is required')
    .trim()
];

router.use(auth);

// Get user stats & dashboard data
router.get('/dashboard', AduSwaraController.getDashboard);

// Get all available topics
router.get('/topics', topicValidation, validate, AduSwaraController.getTopics);

// Get all categories
router.get('/categories', AduSwaraController.getCategories);

// Create new match (find opponent)
router.post('/match/create', createMatchValidation, validate, AduSwaraController.createMatch);

// Get match detail
router.get('/match/:id', AduSwaraController.getMatchDetail);

// Submit match result
router.post('/match/:id/submit', submitResultValidation, validate, AduSwaraController.submitMatchResult);

// Get user match history
router.get('/history', AduSwaraController.getMatchHistory);

// Get leaderboard
router.get('/leaderboard', AduSwaraController.getLeaderboard);

// Create new topic
router.post('/topics', uploadImage.single('image'), AduSwaraController.createAduSwaraTopic);

// Delete topic
router.delete('/topics/:id', AduSwaraController.deleteAduSwaraTopic);

// Update topic
router.put('/topics/:id', uploadImage.single('image'), AduSwaraController.updateAduSwaraTopic);

module.exports = router;
