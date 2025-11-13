const { MentorActivity, User, MentoringDate, StartEnd } = require('../models');
const { sequelize } = require('../models');

class MentorController {
  static async getAllActivities(req, res) {
    try {
      const activitiesByUserId = await MentorActivity.findAll({
        where: { user_id: req.params.id },
        include: [{
          model: User,
          as: 'mentor',
          attributes: ['user_id', 'full_name']
        }]
      });
      res.json({
        success: true,
        message: 'Activities retrieved successfully',
        count: activitiesByUserId.length,
        data: activitiesByUserId
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get activities',
        error: error.message
      });
    }
  }

  static async createActivity(req, res) {
    try {
      const { user_id, judul_aktivitas, deskripsi } = req.body;
      const newActivity = await MentorActivity.create({ user_id, judul_aktivitas, deskripsi });
      res.json({
        success: true,
        message: 'Activity created successfully',
        data: newActivity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create activity',
        error: error.message
      });
    }
  }

  static async createMentoring(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { user_id, date, sessions } = req.body;

      if (!user_id || !date || !Array.isArray(sessions) || sessions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'user_id, date, dan sessions (array of {start, end}) wajib diisi!'
        });
      }

      const mentoringDate = await MentoringDate.create({
        user_id,
        date
      }, { transaction });

      const startEndRecords = [];
      for (const s of sessions) {
        if (!s.start || !s.end) continue; // skip invalid data

        const session = await StartEnd.create({
          mentoring_date_id: mentoringDate.mentoring_date_id,
          start: s.start,
          end: s.end
        }, { transaction });

        startEndRecords.push(session);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Mentoring date & sessions created successfully',
        data: {
          mentoring_date: mentoringDate,
          sessions: startEndRecords
        }
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Failed to create mentoring schedule',
        error: error.message
      });
    }
  }

  static async deleteMentoring(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const mentoringDate = await MentoringDate.findByPk(id);
      if (!mentoringDate) {
        return res.status(404).json({
          success: false,
          message: 'Mentoring schedule not found'
        });
      }

      const mentoringDateId = mentoringDate.mentoring_date_id;

      await StartEnd.destroy({
        where: { mentoring_date_id: mentoringDateId },
        transaction
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Mentoring schedule deleted successfully'
      });
    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Failed to delete mentoring schedule',
        error: error.message
      });
    }
  }

  static async deleteStartEnd(req, res) {
    try {
      const { id } = req.params;

      await StartEnd.destroy({
        where: { start_end_id: id }
      });

      return res.status(200).json({
        success: true,
        message: 'Start end deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete start end',
        error: error.message
      });
    }
  }

  static async getAllMentoring(req, res) {
    try {
      const data = await MentoringDate.findAll({
        include: [
          {
            model: StartEnd,
            as: 'time_slots',
          }
        ],
        order: [['date', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        message: 'List of mentoring schedules',
        data
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch mentoring schedules',
        error: error.message
      });
    }
  }

}

module.exports = MentorController;