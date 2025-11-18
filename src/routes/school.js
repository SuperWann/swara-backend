const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school');
const { authenticateToken } = require('../middleware/auth');
const { validateSchoolRegistration, validateTokenVerification } = require('../validators/school.validator');

// Get all available school packages
router.get('/packages', schoolController.getSchoolPackages);

// Register new school
router.post('/register', validateSchoolRegistration, schoolController.registerSchool);

// Handle Midtrans payment notification
router.post('/payment/notification', schoolController.handlePaymentNotification);

module.exports = router;
