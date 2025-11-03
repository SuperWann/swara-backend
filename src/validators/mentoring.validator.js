const { body, param, query } = require('express-validator');

// Validation for scheduling mentoring
exports.scheduleMentoringValidation = [
  body('mentor_user_id')
    .notEmpty().withMessage('Mentor user ID is required')
    .isInt({ min: 1 }).withMessage('Mentor user ID must be a valid integer'),
  
  body('jadwal')
    .notEmpty().withMessage('Schedule date is required')
    .isISO8601().withMessage('Schedule must be a valid date')
    .custom((value) => {
      const scheduleDate = new Date(value);
      if (scheduleDate < new Date()) {
        throw new Error('Schedule date must be in the future');
      }
      return true;
    }),
  
  body('tujuan_mentoring')
    .notEmpty().withMessage('Mentoring purpose is required')
    .isString().withMessage('Mentoring purpose must be a string')
    .isLength({ min: 10 }).withMessage('Mentoring purpose must be at least 10 characters'),
  
  body('metode_mentoring_id')
    .notEmpty().withMessage('Metode mentoring ID is required')
    .isInt({ min: 1 }).withMessage('Metode mentoring ID must be a valid integer')
];

// Validation for get mentor detail
exports.mentorIdValidation = [
  param('mentorId')
    .notEmpty().withMessage('Mentor ID is required')
    .isInt({ min: 1 }).withMessage('Mentor ID must be a valid integer')
];

// Validation for mentoring ID
exports.mentoringIdValidation = [
  param('mentoringId')
    .notEmpty().withMessage('Mentoring ID is required')
    .isInt({ min: 1 }).withMessage('Mentoring ID must be a valid integer')
];

// Validation for get all mentors query
exports.getAllMentorsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('minFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum fee must be a positive number'),
  
  query('maxFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum fee must be a positive number'),
  
  query('search')
    .optional()
    .isString().withMessage('Search must be a string')
    .trim(),
  
  query('position')
    .optional()
    .isString().withMessage('Position must be a string')
    .trim()
];

// Validation for get user sessions query
exports.getUserSessionsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['paid', 'pending', 'failed']).withMessage('Status must be one of: paid, pending, failed')
];
