const jwt = require('jsonwebtoken');
const { User, Role, Gender, Badge } = require('../models');
const { Op } = require('sequelize');

class AdminController{
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

module.exports = AdminController;