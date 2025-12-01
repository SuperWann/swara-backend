const express = require('express');
const MentorController = require('../controllers/mentor');
const { checkRole, authenticateToken } = require('../middleware/auth');
const { uploadImage } = require('../config/cloudinary');

const router = express.Router();

router.get('/activities/:id', authenticateToken, MentorController.getAllActivities);
router.post('/activity', uploadImage.single('image'), authenticateToken, MentorController.createActivity);
router.put('/activity/:id', uploadImage.single('image'), authenticateToken, MentorController.updateActivity);
router.delete('/activity/:id', authenticateToken, MentorController.deleteActivity);

// Mentoring schedule
router.post('/mentoring', authenticateToken, MentorController.createMentoring);
router.get('/mentoring', authenticateToken, MentorController.getAllMentoring);
router.delete('/mentoring/:id', authenticateToken, MentorController.deleteMentoring);
router.delete('/mentoring/start-end/:id', authenticateToken, MentorController.deleteStartEnd);

// Mentoring sessions
router.get('/:id/sessions', authenticateToken, MentorController.getMentorSessions);
router.get('/session/:sessionId', authenticateToken, MentorController.getSessionDetail);
router.get('/:id/sessions/today', MentorController.getTodayMentorSessions);

// Point history
router.get('/point-history/:id', authenticateToken, MentorController.getPointHistory);
router.get('/average-aspects/:id', authenticateToken, MentorController.getAverageAspects);
router.get('/point-summary/:id', authenticateToken, MentorController.getPointSummary);
router.get('/category-summary/:id', authenticateToken, MentorController.getCategorySummary);




module.exports = router;