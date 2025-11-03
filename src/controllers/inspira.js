const { ContentSwara, CategoryContentSwara, LevelContentSwara, User, GayaPenyampaian, GayaPenyampaianContent, Struktur, StrukturContent, TeknikPembuka, TeknikPembukaContent, Tag, TagContent, WatchHistory, sequelize } = require('../models');
const { Op } = require('sequelize');
const { cloudinary } = require('../config/cloudinary');

class InspiraController {
  static async createContent(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        title,
        description,
        category_content_swara_id,
        level_content_swara_id,
        speaker,
        video_duration,
        gaya_penyampaian_ids,
        struktur_ids,
        teknik_pembuka_ids,
        tag_ids
      } = req.body;

      // Validate required fields
      if (!title || !description || !category_content_swara_id || !level_content_swara_id || !speaker || !video_duration) {
        if (req.file) {
          await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
        }
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Check if video file is uploaded
      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Video file is required'
        });
      }

      // Verify category exists
      const category = await CategoryContentSwara.findByPk(category_content_swara_id);
      if (!category) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Verify level exists
      const level = await LevelContentSwara.findByPk(level_content_swara_id);
      if (!level) {
        await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Level not found'
        });
      }

      // Create content with video URL and thumbnail from Cloudinary
      const content = await ContentSwara.create({
        title,
        description,
        category_content_swara_id,
        level_content_swara_id,
        speaker,
        video_duration,
        url_video: req.file.path,
        thumbnail: req.file.path.replace(/\.(mp4|mpeg|mov|avi|webm)$/, '.jpg'),
        views: 0
      }, { transaction });

      // Add relationships if provided
      if (gaya_penyampaian_ids) {
        const gayaIds = JSON.parse(gaya_penyampaian_ids);
        await content.setGayaPenyampaian(gayaIds, { transaction });
      }

      if (struktur_ids) {
        const strukturIds = JSON.parse(struktur_ids);
        await content.setStruktur(strukturIds, { transaction });
      }

      if (teknik_pembuka_ids) {
        const teknikIds = JSON.parse(teknik_pembuka_ids);
        await content.setTeknikPembuka(teknikIds, { transaction });
      }

      if (tag_ids) {
        const tagIds = JSON.parse(tag_ids);
        await content.setTags(tagIds, { transaction });
      }

      await transaction.commit();

      // Fetch complete content with associations
      const completeContent = await ContentSwara.findByPk(content.content_swara_id, {
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

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: completeContent
      });
    } catch (error) {
      await transaction.rollback();
      
      // Delete uploaded video from Cloudinary if transaction fails
      if (req.file) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, { resource_type: 'video' });
        } catch (deleteError) {
          console.error('Failed to delete video from Cloudinary:', deleteError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create content',
        error: error.message
      });
    }
  }
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