const express = require('express');
const { query } = require('express-validator');
const InspiraController = require('../controllers/inspira');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

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

router.use(auth);

// Get all content with filters
router.get('/', searchValidation, validate, InspiraController.getAllContent);

// Get watch history
router.get('/history', InspiraController.getWatchHistory);

// Get detail content
router.get('/:id', InspiraController.getDetailContent);

// Add view count when user clicks/watches video
router.post('/:id/view', InspiraController.addView);

module.exports = router;