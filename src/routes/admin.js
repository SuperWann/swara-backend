const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/admin');
const { checkRole, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.get('/all', authenticateToken, AdminController.getAllUsers);
router.get('/userStats', authenticateToken, AdminController.getUserDashboardStats);
router.post('/mentor/register', authenticateToken, AdminController.registerMentor);
router.put('/deactivate/:id',
    authenticateToken,
    AdminController.deactivateAccount
);

module.exports = router;