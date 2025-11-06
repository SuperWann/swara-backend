const express = require('express');
const MentorController = require('../controllers/mentor');
const { checkRole, authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/activities/:id', authenticateToken, MentorController.getAllActivities);
router.post('/activity', authenticateToken, MentorController.createActivity);
router.put('/activity/:id', authenticateToken, MentorController.updateActivity);
router.delete('/activity/:id', authenticateToken, MentorController.deleteActivity);

module.exports = router;