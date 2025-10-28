const { ContentSwara, CategoryContentSwara, LevelContentSwara, User, GayaPenyampaian, GayaPenyampaianContent, Struktur, StrukturContent, TeknikPembuka, TeknikPembukaContent, Tag, TagContent, WatchHistory, sequelize } = require('../models');
const { Op } = require('sequelize');

class InspiraController {
  static async getAllContent(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        q = '', 
        category_id,
        level_id,
        sort_by = 'views',
        order = 'DESC'
      } = req.query;
      
      const offset = (page - 1) * limit;

      const whereClause = {};
      
      if (q) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${q}%` } },
          { description: { [Op.like]: `%${q}%` } },
          { speaker: { [Op.like]: `%${q}%` } }
        ];
      }

      if (category_id) {
        whereClause.category_content_swara_id = category_id;
      }

      if (level_id) {
        whereClause.level_content_swara_id = level_id;
      }

      const { count, rows: contents } = await ContentSwara.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: CategoryContentSwara,
            as: 'category',
            attributes: ['category_content_swara_id', 'category_name']
          },
          {
            model: LevelContentSwara,
            as: 'level',
            attributes: ['level_content_swara_id', 'level_name']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sort_by, order]],
        distinct: true
      });

      res.json({
        success: true,
        message: 'Content retrieved successfully',
        data: {
          contents,
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
        message: 'Failed to get content',
        error: error.message
      });
    }
  }

  static async getDetailContent(req, res) {
    try {
      const { id } = req.params;

      const content = await ContentSwara.findByPk(id, {
        include: [
          {
            model: CategoryContentSwara,
            as: 'category',
            attributes: ['category_content_swara_id', 'category_name']
          },
          {
            model: LevelContentSwara,
            as: 'level',
            attributes: ['level_content_swara_id', 'level_name']
          },
          {
            model: GayaPenyampaian,
            as: 'gayaPenyampaian',
            through: { attributes: [] },
            attributes: ['gaya_penyampaian_id', 'gaya_penyampaian']
          },
          {
            model: Struktur,
            as: 'struktur',
            through: { attributes: [] },
            attributes: ['struktur_id', 'struktur']
          },
          {
            model: TeknikPembuka,
            as: 'teknikPembuka',
            through: { attributes: [] },
            attributes: ['teknik_pembuka_id', 'teknik_pembuka']
          },
          {
            model: Tag,
            as: 'tags',
            through: { attributes: [] },
            attributes: ['tag_id', 'tag_name']
          }
        ]
      });

      if (!content) {
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      res.json({
        success: true,
        message: 'Content detail retrieved successfully',
        data: content
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get content detail',
        error: error.message
      });
    }
  }

  static async addView(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      
      const watch_duration = req.body?.watch_duration || null;
      const is_completed = req.body?.is_completed || false;

      const content = await ContentSwara.findByPk(id);
      if (!content) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Content not found'
        });
      }

      await ContentSwara.increment('views', {
        by: 1,
        where: { content_swara_id: id },
        transaction
      });

      await WatchHistory.create({
        user_id: userId,
        content_swara_id: id,
        watch_duration: watch_duration,
        is_completed: is_completed,
        watched_at: new Date()
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'View recorded successfully',
        data: {
          content_swara_id: id,
          views: content.views + 1
        }
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: 'Failed to record view',
        error: error.message
      });
    }
  }

  static async getWatchHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.user_id;

      const { count, rows: history } = await WatchHistory.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: ContentSwara,
            as: 'content',
            attributes: [
              'content_swara_id',
              'title',
              'thumbnail',
              'speaker',
              'video_duration',
              'views'
            ],
            include: [
              {
                model: CategoryContentSwara,
                as: 'category',
                attributes: ['category_content_swara_id', 'category_name']
              },
              {
                model: LevelContentSwara,
                as: 'level',
                attributes: ['level_content_swara_id', 'level_name']
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['watched_at', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        message: 'Watch history retrieved successfully',
        data: {
          history,
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
        message: 'Failed to get watch history',
        error: error.message
      });
    }
  }
}

module.exports = InspiraController;