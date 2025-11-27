const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/school');
const { authenticateToken, checkRole } = require('../middleware/auth');
const { 
  validateSchoolRegistration, 
  validateAddMentor
} = require('../validators/school.validator');

// Get all available school packages
router.get('/packages', schoolController.getSchoolPackages);

// Register new school
router.post('/register', validateSchoolRegistration, schoolController.registerSchool);

// Handle Midtrans payment notification
router.post('/payment/notification', schoolController.handlePaymentNotification);

// Add mentor/teacher to school
router.post('/mentors', authenticateToken, validateAddMentor, schoolController.addMentor);

// Get all mentors in school (for school admin)
router.get('/mentors', authenticateToken, schoolController.getSchoolMentors);

// Update mentor/teacher
router.put('/mentors/:mentorId', authenticateToken, schoolController.updateMentor);

// Delete mentor/teacher
router.delete('/mentors/:mentorId', authenticateToken, schoolController.deleteMentor);

module.exports = router;
