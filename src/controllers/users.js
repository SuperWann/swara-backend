const jwt = require('jsonwebtoken');
const { User, Role, Gender } = require('../models');
const { Op } = require('sequelize');

class UserController {
  static async register(req, res) {
    try {
      const { full_name, email, password, phone_number, birth_date, address, gender_id } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Get default role (user)
      let role = await Role.findOne({ where: { role_name: 'user' } });
      if (!role) {
        role = await Role.create({ role_name: 'user' });
      }

      // Create user
      const user = await User.create({
        full_name,
        email,
        password,
        phone_number,
        birth_date,
        address,
        gender_id,
        role_id: role.role_id
      });

      // Generate token
      const token = jwt.sign(
        { user_id: user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      // Fetch user with relations
      const userWithRelations = await User.findByPk(user.user_id, {
        include: [
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: userWithRelations,
          token
        }
      });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // Login
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.scope('withPassword').findOne({
        where: { email },
        include: [
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate token
      const token = jwt.sign(
        { user_id: user.user_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      // Dalam JWT stateless, logout dilakukan di client side dengan menghapus token
      // Bisa tambahkan blacklist token jika diperlukan

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  // Get Profile
  static async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.user_id, {
        include: [
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Update Profile
  static async updateProfile(req, res) {
    try {
      const { full_name, phone_number, birth_date, address, gender_id } = req.body;
      const user = await User.findByPk(req.user.user_id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update fields
      await user.update({
        full_name: full_name || user.full_name,
        phone_number: phone_number !== undefined ? phone_number : user.phone_number,
        birth_date: birth_date !== undefined ? birth_date : user.birth_date,
        address: address !== undefined ? address : user.address,
        gender_id: gender_id !== undefined ? gender_id : user.gender_id
      });

      // Fetch updated user with relations
      const updatedUser = await User.findByPk(user.user_id, {
        include: [
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
        ]
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors.map(e => ({
            field: e.path,
            message: e.message
          }))
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // Change Password
  static async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      const user = await User.scope('withPassword').findByPk(req.user.user_id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(current_password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = new_password;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: error.message
      });
    }
  }

  // Delete Account
  static async deleteAccount(req, res) {
    try {
      const { password } = req.body;

      const user = await User.scope('withPassword').findByPk(req.user.user_id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify password before deletion
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid password'
        });
      }

      await user.destroy();

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: error.message
      });
    }
  }

  // Get All Users (Admin)
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = search ? {
        [Op.or]: [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      } : {};

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Role, as: 'role', attributes: ['role_id', 'role_name'], where: {
              role_name: {
                [Op.notIn]: ['admin', 'mentor'] 
              }
            }
          },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get users',
        error: error.message
      });
    }
  }
}

// Add scope for withPassword
User.addScope('withPassword', {
  attributes: { include: ['password'] }
});

module.exports = UserController;