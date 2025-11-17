const jwt = require('jsonwebtoken');
const { User, Role, Gender, SkorSwara, PodiumText, PodiumCategory } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

class AdminController {
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '' } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = search
        ? {
          [Op.or]: [
            { full_name: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        }
        : {};

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["role_id", "role_name"],
            where: {
              role_name: {
                [Op.notIn]: ["admin", "mentor"]
              }
            }
          },
          {
            model: Gender,
            as: "gender",
            attributes: ["gender_id", "gender"]
          },
          {
            model: SkorSwara,
            as: "skorSwara",
            attributes: [] // Kosongkan untuk tidak duplikat data
          }
        ],
        attributes: {
          include: [
            [
              literal(`(
                SELECT COALESCE(SUM(
                  kelancaran_point + penggunaan_bahasa_point + ekspresi_point
                ), 0)
                FROM skor_swara
                WHERE skor_swara.user_id = User.user_id
              )`),
              "skorSwara"
            ]
          ]
        },
        group: ["User.user_id", "role.role_id", "gender.gender_id"],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        subQuery: false, // Penting untuk menghindari konflik GROUP BY
        distinct: true // Untuk count yang benar
      });

      res.json({
        success: true,
        message: "Users retrieved successfully",
        data: {
          users,
          pagination: {
            total: count.length ?? count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count.length ?? count) / limit)
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get users",
        error: error.message
      });
    }
  }

  static async registerMentor(req, res) {
    try {
      const { full_name, email, password, phone_number, gender_id, birth_date } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      const role = await Role.findOne({ where: { role_name: 'mentor' } });
      if (!role) {
        return res.status(500).json({
          success: false,
          message: 'Mentor role not found'
        });
      }

      const user = await User.create({
        full_name,
        email,
        password,
        phone_number,
        gender_id,
        birth_date,
        role_id: role.role_id
      });
      res.status(201).json({
        success: true,
        message: 'Mentor registered successfully',
        data: {
          user: {
            user_id: user.user_id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            gender_id: user.gender_id,
            birth_date: user.birth_date,
            role_id: user.role_id
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to register mentor',
        error: error.message
      });
    }
  }

  static async deactivateAccount(req, res) {
    try {
      const user = await User.findByPk(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      user.status = 'nonaktif';

      await user.save();
      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate account',
        error: error.message
      });
    }
  }

  static async getStatsManajemenPengguna(req, res) {
    try {
      // Total pengguna
      const totalUsers = await User.count();

      // Pengguna aktif (status ENUM)
      const activeUsers = await User.count({
        where: { status: "aktif" }
      });

      // Total mentor (join roles)
      const totalMentors = await User.count({
        include: [
          {
            model: Role,
            as: "role",
            where: { role_name: "mentor" },
          },
        ],
      });

      // Pengguna baru bulan ini
      const newUsersThisMonth = await User.count({
        where: literal(`
        MONTH(created_at) = MONTH(NOW())
        AND YEAR(created_at) = YEAR(NOW())
      `)
      });

      return res.status(200).json({
        success: true,
        data: {
          totalUsers,
          activeUsers,
          totalMentors,
          newUsersThisMonth,
        },
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard statistics",
        error: error.message
      });
    }
  }

  static async getStatsDashboardAdmin(req, res) {
    try {
      const activeUsers = await User.count({
        where: { status: "aktif" }
      });

      const totalMentors = await User.count({
        include: [
          {
            model: Role,
            as: "role",
            where: { role_name: "mentor" },
          },
        ],
      });

      return res.status(200).json({
        success: true,
        data: {
          activeUsers,
          totalMentors,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch admin dashboard statistics",
        error: error.message
      });
    }
  }

  static async getPodiumStats(req, res) {
    try {
      const totalPodiumTexts = await PodiumText.count();

      const getAllCategorieswithCounts = await PodiumCategory.findAll({
        attributes: [
          'podium_category_id',
          'podium_category',
          'is_interview',
          [fn('COUNT', col('podium_category_id')), 'count']
        ],
        group: ['podium_category_id', 'podium_category', 'is_interview'],
        raw: true
      });

      const newPodiumTextsThisMonth = await PodiumText.count({
        where: literal(`
        MONTH(created_at) = MONTH(NOW())
        AND YEAR(created_at) = YEAR(NOW())
      `)
      });

      res.json({
        success: true,
        message: 'Podium texts retrieved successfully',
        data: {
          totalPodiumTexts,
          categories: getAllCategorieswithCounts,
          newPodiumTextsThisMonth
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get podium texts',
        error: error.message
      });
    }
  }
}

module.exports = AdminController;