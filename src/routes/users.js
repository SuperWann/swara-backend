const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/users');
const { auth, checkRole, authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('full_name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Full name must be between 2-255 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/).withMessage('Invalid phone number format'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const updateProfileValidation = [
  body('full_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Full name must be between 2-255 characters'),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/).withMessage('Invalid phone number format'),
  body('address')
    .optional()
    .isString().withMessage('Address must be a string')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Address must be between 3-255 characters'),
  body('profile_picture')
    .optional()
    .isString().withMessage('Profile picture must be a string'),
  body('birth_date')
    .optional()
    .isDate().withMessage('Invalid date format'),
  body('gender_id')
    .optional()
    .isInt().withMessage('Gender ID must be a number')
];

const changePasswordValidation = [
  body('current_password')
    .notEmpty().withMessage('Current password is required'),
  body('new_password')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

const deleteAccountValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Public routes
router.post('/register', registerValidation, validate, UserController.register);
router.post('/login', loginValidation, validate, UserController.login);

// Protected routes
router.post('/logout', authenticateToken, UserController.logout);
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', uploadImage.single('image'), authenticateToken, updateProfileValidation, validate, UserController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, validate, UserController.changePassword);
router.delete('/account', authenticateToken, deleteAccountValidation, validate, UserController.deleteAccount);
router.get('/badges', authenticateToken, UserController.getUserBadges);
router.get('/riwayat-latihan', authenticateToken, UserController.getTrainingHistory);

module.exports = router;