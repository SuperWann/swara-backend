const { ContentSwara, CategoryContentSwara, LevelContentSwara, User, GayaPenyampaian, GayaPenyampaianContent, Struktur, StrukturContent, TeknikPembuka, TeknikPembukaContent, Tag, TagContent, WatchHistory, Transkrip, sequelize } = require('../models');
const { Op } = require('sequelize');
const { cloudinary } = require('../config/cloudinary');

async function getOrCreateList(model, field, list, transaction) {
  const ids = [];
  for (const name of list) {
    const [row] = await model.findOrCreate({
      where: { [field]: name.trim() },
      defaults: { [field]: name.trim() },
      transaction
    });
    ids.push(row.id || row[`${field}_id`] || row.dataValues.id);
  }
  return ids;
}

class InspiraController {

  static async createContent(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const {
        title, thumbnail, url_video, description,
        category_content_swara_id, level_content_swara_id,
        speaker, video_duration,
        transkrip,
        gaya_penyampaian, struktur, teknik_pembuka
      } = req.body;

      // 1) Create content
      const content = await ContentSwara.create({
        title, thumbnail, url_video, description,
        category_content_swara_id, level_content_swara_id,
        speaker, video_duration
      }, { transaction });

      // 2) Insert Transkrip
      if (Array.isArray(transkrip)) {
        for (const t of transkrip) {
          await Transkrip.create({
            waktu: t.waktu,
            transkrip: t.transkrip,
            content_swara_id: content.content_swara_id
          }, { transaction });
        }
      }

      // Convert string → array kalau user kirim "A, B"
      const toArray = v => Array.isArray(v) ? v : (v || "").split(",").map(x => x.trim());

      const gayaArr = toArray(gaya_penyampaian);
      const strukturArr = toArray(struktur);
      const teknikArr = toArray(teknik_pembuka);

      // 3) Get or Create list for many-to-many
      const gayaIDs = await getOrCreateList(GayaPenyampaian, 'gaya_penyampaian', gayaArr, transaction);
      const strukturIDs = await getOrCreateList(Struktur, 'struktur', strukturArr, transaction);
      const teknikIDs = await getOrCreateList(TeknikPembuka, 'teknik_pembuka', teknikArr, transaction);

      // 4) Attach bridges/pivot
      await content.setGayaPenyampaian(gayaIDs, { transaction });
      await content.setStruktur(strukturIDs, { transaction });
      await content.setTeknikPembuka(teknikIDs, { transaction });

      await transaction.commit();
      return res.status(201).json({ success: true, message: "Content & relation created" });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({ success: false, message: "Failed", error: error.message });
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

      const getCategory = await CategoryContentSwara.findAll();

      res.json({
        success: true,
        message: 'Content retrieved successfully',
        data: {
          contents,
          categories: getCategory,
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

  static async deleteContent(req, res) {
    const transaction = await sequelize.transaction();

    try {
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: Please login first"
        });
      }

      const { id } = req.params;

      const content = await ContentSwara.findByPk(id);
      if (!content) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Content not found"
        });
      }

      await content.destroy({ transaction });
      await transaction.commit();

      return res.json({
        success: true,
        message: "Content deleted successfully"
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to delete content",
        error: error.message
      });
    }
  }

  static async updateContent(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const {
        title, thumbnail, url_video, description,
        category_content_swara_id, level_content_swara_id,
        speaker, video_duration,
        transkrip,
        gaya_penyampaian, struktur, teknik_pembuka
      } = req.body;

      // 1) Find content
      const content = await ContentSwara.findByPk(id, { transaction });

      if (!content) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "Content not found" });
      }

      // 2) Update main content
      await content.update({
        title, thumbnail, url_video, description,
        category_content_swara_id, level_content_swara_id,
        speaker, video_duration
      }, { transaction });

      // 3) Update transkrip (hapus lama → insert baru)
      if (Array.isArray(transkrip)) {
        await Transkrip.destroy({
          where: { content_swara_id: id },
          transaction
        });

        for (const t of transkrip) {
          await Transkrip.create({
            waktu: t.waktu,
            transkrip: t.transkrip,
            content_swara_id: id
          }, { transaction });
        }
      }

      // Helper convert string -> array
      const toArray = v => Array.isArray(v) ? v : (v || "").split(",").map(x => x.trim());

      const gayaArr = toArray(gaya_penyampaian);
      const strukturArr = toArray(struktur);
      const teknikArr = toArray(teknik_pembuka);

      // 4) Get IDs
      const gayaIDs = await getOrCreateList(GayaPenyampaian, "gaya_penyampaian", gayaArr, transaction);
      const strukturIDs = await getOrCreateList(Struktur, "struktur", strukturArr, transaction);
      const teknikIDs = await getOrCreateList(TeknikPembuka, "teknik_pembuka", teknikArr, transaction);

      // 5) Sync many-to-many
      await content.setGayaPenyampaian(gayaIDs, { transaction });
      await content.setStruktur(strukturIDs, { transaction });
      await content.setTeknikPembuka(teknikIDs, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: "Content updated successfully",
        data: content
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to update content",
        error: error.message
      });
    }
  }

}

module.exports = InspiraController;