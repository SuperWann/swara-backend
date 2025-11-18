const { body, validationResult } = require('express-validator');

exports.validateSchoolRegistration = [
  body('school_name')
    .trim()
    .notEmpty().withMessage('School name is required')
    .isLength({ min: 3, max: 255 }).withMessage('School name must be between 3-255 characters'),

  body('npsn')
    .trim()
    .notEmpty().withMessage('NPSN is required')
    .isLength({ min: 8, max: 20 }).withMessage('NPSN must be between 8-20 characters')
    .matches(/^[0-9]+$/).withMessage('NPSN must contain only numbers'),

  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 10 }).withMessage('Address must be at least 10 characters'),

  body('school_status')
    .notEmpty().withMessage('School status is required')
    .isIn(['negeri', 'swasta']).withMessage('School status must be "negeri" or "swasta"'),

  body('official_email')
    .trim()
    .notEmpty().withMessage('Official email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('pic_name')
    .trim()
    .notEmpty().withMessage('PIC name is required')
    .isLength({ min: 3, max: 255 }).withMessage('PIC name must be between 3-255 characters'),

  body('pic_position')
    .trim()
    .notEmpty().withMessage('PIC position is required')
    .isLength({ min: 3, max: 100 }).withMessage('PIC position must be between 3-100 characters'),

  body('pic_phone')
    .trim()
    .notEmpty().withMessage('PIC phone is required')
    .matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 }).withMessage('Phone number must be between 10-20 characters'),

  body('package_id')
    .notEmpty().withMessage('Package is required')
    .isInt({ min: 1 }).withMessage('Invalid package ID'),

  body('student_count')
    .notEmpty().withMessage('Student count is required')
    .isInt({ min: 1 }).withMessage('Student count must be at least 1'),

  body('mentor_count')
    .notEmpty().withMessage('Mentor count is required')
    .isInt({ min: 1 }).withMessage('Mentor count must be at least 1'),

  body('duration_months')
    .notEmpty().withMessage('Duration is required')
    .isIn(['1', '3', '6', '12']).withMessage('Duration must be 1, 3, 6, or 12 months'),

  // Middleware to handle validation results
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }
];