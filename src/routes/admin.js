const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/admin');
const { checkRole, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.get('/all', authenticateToken, AdminController.getAllUsers);
router.get('/dashboardStats', authenticateToken, AdminController.getStatsDashboardAdmin);
router.get('/userStats', authenticateToken, AdminController.getStatsManajemenPengguna);
router.get('/podiumStats', authenticateToken, AdminController.getPodiumStats);
router.post('/mentor/register', authenticateToken, AdminController.registerMentor);
router.put('/deactivate/:id',
    authenticateToken,
    AdminController.deactivateAccount
);

module.exports = router;