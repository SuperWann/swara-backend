const { MentorActivity, User, MentoringDate, StartEnd, Mentoring, MentoringPayment } = require('../models');
const { sequelize } = require('../models');
const { Op } = require('sequelize');

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
      const newActivity = await MentorActivity.create(
        {
          user_id,
          judul_aktivitas,
          deskripsi,
          image: req.file ? req.file.path : null
        });
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
        message: 'Failed to create  schedule',
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
        message: 'Failed to delete  schedule',
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
        message: 'List of  schedules',
        data
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch  schedules',
        error: error.message
      });
    }
  }

  static async updateActivity(req, res) {
    try {
      const { id } = req.params;
      const { judul_aktivitas, deskripsi } = req.body;
      const [updated] = await MentorActivity.update(
        { judul_aktivitas, deskripsi, image: req.file ? req.file.path : null },
        { where: { mentor_activity_id: id } }
      );
      if (updated) {
        res.json({
          success: true,
          message: 'Activity updated successfully',
          data: { id, judul_aktivitas, deskripsi }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Activity not found',
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update activity',
        error: error.message
      });
    }
  }
  static async deleteActivity(req, res) {
    try {
      const { id } = req.params;
      const deleted = await MentorActivity.destroy({ where: { mentor_activity_id: id } });
      if (deleted) {
        res.json({
          success: true,
          message: 'Activity deleted successfully',
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Activity not found',
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete activity',
        error: error.message
      });
    }
  }

  static async getMentorSessions(req, res) {
    try {
      const mentorUserId = req.params.id;
      const { status } = req.query;

      console.log('Getting sessions for mentor:', mentorUserId, 'with status:', status);

      const whereClause = { mentor_user_id: mentorUserId };
      const now = new Date();

      const mentoringSessions = await Mentoring.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'mentee',
            attributes: ['user_id', 'full_name', 'email', 'phone_number']
          },
          {
            model: MentoringPayment,
            as: 'payment',
            attributes: ['payment_id', 'order_id', 'payment_url', 'transaction_status', 'gross_amount', 'payment_type', 'paid_at'],
            required: false
          }
        ],
        order: [['jadwal', 'DESC']]
      });

      console.log('Found sessions:', mentoringSessions.length);

      let formattedSessions = mentoringSessions.map(session => {
        const sessionDate = new Date(session.jadwal);
        const isUpcoming = sessionDate >= now;

        let sessionStatus = 'terjadwal';
        if (sessionDate < now) {
          sessionStatus = 'selesai';
        }

        const transactionStatus = session.payment?.transaction_status || 'pending';
        const isPaid = transactionStatus === 'settlement' || transactionStatus === 'capture';

        return {
          mentoring_id: session.mentoring_id,

          mentee: {
            user_id: session.mentee.user_id,
            full_name: session.mentee.full_name,
            email: session.mentee.email,
            phone_number: session.mentee.phone_number
          },

          jadwal: session.jadwal,
          tujuan_mentoring: session.tujuan_mentoring,
          metode_mentoring_id: session.metode_mentoring_id,
          status: sessionStatus,

          payment_status: transactionStatus,
          is_paid: isPaid,
          payment_info: session.payment ? {
            payment_id: session.payment.payment_id,
            order_id: session.payment.order_id,
            payment_url: session.payment.payment_url,
            gross_amount: session.payment.gross_amount,
            payment_type: session.payment.payment_type,
            paid_at: session.payment.paid_at
          } : null,

          formatted_date: sessionDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          formatted_time: sessionDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      });

      if (status === 'terjadwal') {
        formattedSessions = formattedSessions.filter(s => s.status === 'terjadwal');
      } else if (status === 'selesai') {
        formattedSessions = formattedSessions.filter(s => s.status === 'selesai');
      } else if (status === 'dibatalkan') {
        formattedSessions = formattedSessions.filter(s => s.status === 'dibatalkan');
      }

      const uniqueMentees = new Set(formattedSessions.map(s => s.mentee.user_id));
      const terjadwalCount = formattedSessions.filter(s => s.status === 'terjadwal').length;
      const selesaiCount = formattedSessions.filter(s => s.status === 'selesai').length;

      res.json({
        success: true,
        message: 'Mentoring sessions retrieved successfully',
        data: {
          sessions: formattedSessions,
          statistics: {
            total_peserta: uniqueMentees.size,
            sesi_terjadwal: terjadwalCount,
            sesi_selesai: selesaiCount,
            total_sesi: formattedSessions.length
          }
        }
      });

    } catch (error) {
      console.error('Get mentor sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get  sessions',
        error: error.message
      });
    }
  }

  static async getSessionDetail(req, res) {
    try {
      const { sessionId } = req.params;
      const mentorUserId = req.user?.user_id;

      console.log('Getting session detail:', sessionId, 'for mentor:', mentorUserId);

      const session = await Mentoring.findOne({
        where: {
          mentoring_id: sessionId
        },
        include: [
          {
            model: User,
            as: 'mentee',
            attributes: ['user_id', 'full_name', 'email', 'phone_number']
          },
          {
            model: MentoringPayment,
            as: 'payment',
            attributes: ['payment_id', 'order_id', 'payment_url', 'transaction_status', 'gross_amount', 'payment_type', 'paid_at'],
            required: false
          }
        ]
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      if (mentorUserId && session.mentor_user_id !== mentorUserId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this session'
        });
      }

      const sessionDate = new Date(session.jadwal);
      const now = new Date();
      const isUpcoming = sessionDate >= now;
      const transactionStatus = session.payment?.transaction_status || 'pending';
      const isPaid = transactionStatus === 'settlement' || transactionStatus === 'capture';

      const totalSessionsCount = await Mentoring.count({
        where: {
          mentor_user_id: session.mentor_user_id,
          mentee_user_id: session.mentee_user_id
        }
      });

      const detailedSession = {
        mentoring_id: session.mentoring_id,

        mentee: {
          user_id: session.mentee.user_id,
          full_name: session.mentee.full_name,
          email: session.mentee.email,
          phone_number: session.mentee.phone_number,
          rating: null,
          total_sessions_with_mentor: totalSessionsCount
        },

        session_info: {
          jadwal: session.jadwal,
          formatted_date: sessionDate.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
          formatted_time: sessionDate.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          duration: '60 Menit',
          tujuan_mentoring: session.tujuan_mentoring,
          status: isUpcoming ? 'terjadwal' : 'selesai'
        },

        metode: {
          metode_mentoring_id: session.metode_mentoring_id,
          metode_name: 'Zoom/Google Meeting'
        },

        payment: {
          payment_status: transactionStatus,
          is_paid: isPaid,
          gross_amount: session.payment?.gross_amount || 0,
          payment_type: session.payment?.payment_type || null,
          paid_at: session.payment?.paid_at || null,
          order_id: session.payment?.order_id || null,
          payment_url: session.payment?.payment_url || null
        },

        // Additional info
        created_at: session.created_at
      };

      res.json({
        success: true,
        message: 'Session detail retrieved successfully',
        data: detailedSession
      });

    } catch (error) {
      console.error('Get session detail error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session detail',
        error: error.message
      });
    }
  }
}

module.exports = MentorController;