const jwt = require('jsonwebtoken');
const { User, Role, Gender, Mentee, Badge } = require('../models');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../utils/tokenUtils');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const moment = require("moment");

async function resetDailyTokens(mentee) {
  const now = new Date();
  const lastReset = new Date(mentee.last_token_reset);

  const diffInDays = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

  if (diffInDays >= 1) {
    mentee.token_count += 6;
    mentee.last_token_reset = now;
    await mentee.save();
    console.log(`✅ Token mentee ${mentee.mentee_id} telah direset ke 6`);
  }

  return mentee.token_count;
}

class UserController {
  static async register(req, res) {
    try {
      const { full_name, email, password, phone_number } = req.body;

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
        role_id: role.role_id
      });

      // Create mentee
      const mentee = await Mentee.create({ user_id: user.user_id, point: 0, exercise_count: 0, minute_count: 0, token: 6 });

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Simpan refresh token ke database dengan Sequelize
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 hari

      await user.update({
        refreshToken: refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiresAt
      });

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
          mentee: mentee,
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
  // static async login(req, res) {
  //   try {
  //     const { email, password } = req.body;

  //     // Find user
  //     const user = await User.scope('withPassword').findOne({
  //       where: { email },
  //       include: [
  //         { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
  //         { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] }
  //       ]
  //     });

  //     if (!user) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid email or password'
  //       });
  //     }

  //     // Compare password
  //     const isPasswordValid = await user.comparePassword(password);
  //     if (!isPasswordValid) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid email or password'
  //       });
  //     }

  //     // Generate token
  //     const token = jwt.sign(
  //       { user_id: user.user_id },
  //       process.env.JWT_SECRET,
  //       { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  //     );

  //     res.json({
  //       success: true,
  //       message: 'Login successful',
  //       data: {
  //         user: user.toJSON(),
  //         token
  //       }
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       message: 'Login failed',
  //       error: error.message
  //     });
  //   }
  // }
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validasi input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Cari user dengan Sequelize
      const user = await User.findOne({
        where: { email },
        include: [
          {
            model: Mentee,
            as: 'mentee',
            attributes: ['mentee_id', 'point', 'exercise_count', 'minute_count', 'token_count', 'last_token_reset']
          },
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
        ]
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const mentee = user.mentee[0];

      if (mentee) {
        await resetDailyTokens(mentee);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Simpan refresh token ke database dengan Sequelize
      const refreshTokenExpiresAt = new Date();
      refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + 7); // 7 hari

      await user.update({
        refreshToken: refreshToken,
        refreshTokenExpiresAt: refreshTokenExpiresAt
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            mentee: user.mentee,
          },
          role: user.role.role_name,
          accessToken,
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: error.message
      });
    }
  }

  // Logout
  // static async logout(req, res) {
  //   try {
  //     // Dalam JWT stateless, logout dilakukan di client side dengan menghapus token
  //     // Bisa tambahkan blacklist token jika diperlukan

  //     res.json({
  //       success: true,
  //       message: 'Logout successful'
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       message: 'Logout failed',
  //       error: error.message
  //     });
  //   }
  // }
  static async logout(req, res) {
    try {
      const userId = req.user.user_id;

      // Hapus refresh token dengan Sequelize
      await User.update(
        {
          refreshToken: null,
          refreshTokenExpiresAt: null
        },
        {
          where: { user_id: userId }
        }
      );

      res.json({
        success: true,
        message: 'Logout successful. Please remove tokens from client.'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: error.message
      });
    }
  }

  // REFRESH TOKEN
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (error) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Check token di database dengan Sequelize
      const user = await User.findOne({
        where: {
          user_id: decoded.user_id,
          refreshToken: refreshToken,
          refreshTokenExpiresAt: {
            [Op.gt]: new Date() // greater than NOW()
          }
        }
      });

      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'Invalid refresh token or token has been revoked'
        });
      }

      // Generate access token baru
      const newAccessToken = generateAccessToken(user);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: error.message
      });
    }
  }

  static async getUserBadges(req, res) {
    try {
      const userId = req.params.user_id || req.user.user_id;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: Badge,
            as: 'badges',
            through: { attributes: [] } // menyembunyikan kolom user badges (pivot)
          }
        ]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        message: 'Badges retrieved successfully',
        count: user.badges.length,
        data: user.badges,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get badges',
        error: error.message,
      });
    }
  }


  // Get Profile
  static async getProfile(req, res) {
    try {
      const userId = req.params.user_id || req.user.user_id;

      const user = await User.findByPk(userId, {
        include: [
          { model: Role, as: 'role', attributes: ['role_id', 'role_name'] },
          { model: Gender, as: 'gender', attributes: ['gender_id', 'gender'] },
          { model: Mentee, as: 'mentee', attributes: ['point', 'exercise_count', 'minute_count'] }
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
        gender_id: gender_id !== undefined ? gender_id : user.gender_id,
        profile_picture: req.file ? req.file.path : user.profile_picture
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
}

// Add scope for withPassword
User.addScope('withPassword', {
  attributes: { include: ['password'] }
});

module.exports = UserController;