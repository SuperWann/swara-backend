const express = require('express');
const { body, query } = require('express-validator');
const PodiumController = require('../controllers/podium');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

const startPodiumValidation = [
  body('podium_category_id')
    .notEmpty().withMessage('Category ID is required')
    .isInt({ min: 1 }).withMessage('Category ID must be a valid number')
];

const submitResultValidation = [
  body('session_id')
    .notEmpty().withMessage('Session ID is required')
    .isInt({ min: 1 }).withMessage('Session ID must be a valid number'),
  body('self_confidence')
    .notEmpty().withMessage('Self confidence score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Self confidence must be between 0-100'),
  body('time_management')
    .notEmpty().withMessage('Time management score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Time management must be between 0-100'),
  body('audiens_interest')
    .notEmpty().withMessage('Audience interest score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Audience interest must be between 0-100'),
  body('sentence_structure')
    .notEmpty().withMessage('Sentence structure score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Sentence structure must be between 0-100')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100')
];

router.use(auth);

// Get Podium categories (must be before /categories/:id)
router.get('/categories', PodiumController.getCategories);

// Get Podium Category Details
router.get('/categories/:id', PodiumController.getCategoryDetail);

// Start new podium session with selected category
router.post('/start', startPodiumValidation, validate, PodiumController.startPodium);

// Submit podium result
router.post('/submit', submitResultValidation, validate, PodiumController.submitPodiumResult);

// Get user's progress history
router.get('/progress', paginationValidation, validate, PodiumController.getProgress);

// Get specific progress detail
router.get('/progress/:id', PodiumController.getProgressDetail);

module.exports = router;
