const express = require('express');
const { query, body } = require('express-validator');
const InspiraController = require('../controllers/inspira');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { uploadVideo } = require('../config/cloudinary');

const router = express.Router();

const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1 }).withMessage('Search query must not be empty'),
  query('category_id')
    .optional()
    .isInt().withMessage('Category ID must be a number'),
  query('level_id')
    .optional()
    .isInt().withMessage('Level ID must be a number'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
];

const createContentValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title must not exceed 100 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),
  body('category_content_swara_id')
    .notEmpty().withMessage('Category is required')
    .isInt().withMessage('Category ID must be a number'),
  body('level_content_swara_id')
    .notEmpty().withMessage('Level is required')
    .isInt().withMessage('Level ID must be a number'),
  body('speaker')
    .trim()
    .notEmpty().withMessage('Speaker is required'),
  body('video_duration')
    .notEmpty().withMessage('Video duration is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Video duration must be in HH:MM:SS format'),
  body('gaya_penyampaian_ids')
    .optional()
    .isJSON().withMessage('Gaya penyampaian IDs must be a valid JSON array'),
  body('struktur_ids')
    .optional()
    .isJSON().withMessage('Struktur IDs must be a valid JSON array'),
  body('teknik_pembuka_ids')
    .optional()
    .isJSON().withMessage('Teknik pembuka IDs must be a valid JSON array'),
  body('tag_ids')
    .optional()
    .isJSON().withMessage('Tag IDs must be a valid JSON array')
];

router.use(auth);

// Create new content with video upload
router.post('/', uploadVideo.single('video'), createContentValidation, validate, InspiraController.createContent);

// Get all content with filters
router.get('/', searchValidation, validate, InspiraController.getAllContent);

// Get watch history
router.get('/history', InspiraController.getWatchHistory);

// Get detail content
router.get('/:id', InspiraController.getDetailContent);

// Add view count when user clicks/watches video
router.post('/:id/view', InspiraController.addView);

module.exports = router;