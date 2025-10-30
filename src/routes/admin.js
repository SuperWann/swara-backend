const express = require('express');
const { body } = require('express-validator');
const AdminController = require('../controllers/admin');
const { auth, checkRole, authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const router = express.Router();

// Admin routes
router.get('/all', authenticateToken, checkRole('admin'), AdminController.getAllUsers);

module.exports = router;