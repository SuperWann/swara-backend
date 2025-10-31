const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/admin');
const { checkRole, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.get('/all', authenticateToken, checkRole('admin'), AdminController.getAllUsers);
router.post('/mentor/register', authenticateToken, checkRole('admin'), AdminController.registerMentor);

module.exports = router;