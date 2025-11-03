const jwt = require('jsonwebtoken');
const { User, Role, Gender } = require('../models');
const { verifyAccessToken } = require('../utils/tokenUtils');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      where: { user_id: decoded.user_id },
      include: [
        { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
        { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions'
      });
    }

    next();
  };
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    try {
      const decoded = verifyAccessToken(token);
      
      // Fetch user with role information from database
      const user = await User.findByPk(decoded.user_id, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['role_id', 'role_name']
          }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Attach complete user object with role
      req.user = {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        role: user.role
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Invalid access token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

module.exports = { 
  auth, 
  checkRole, 
  authenticateToken,
  authenticate: authenticateToken  // alias for compatibility
};