const { MentorActivity, User, MentoringDate, SkorSwara, Match, MatchResult, ProgressPodium, PodiumSession, StartEnd, Mentoring, MentoringPayment } = require('../models');
const { sequelize } = require('../models');
const { QueryTypes } = require("sequelize");
const { Op } = require('sequelize');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avgOfAvailable(values) {
  // values = array of numbers or null
  const valid = values.filter(v => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  const sum = valid.reduce((s, x) => s + Number(x), 0);
  return sum / valid.length;
}

function round(v) {
  if (v === null || v === undefined) return null;
  return Number(Number(v).toFixed(2));
}

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

  static async getTodayMentorSessions(req, res) {
    try {
      const mentorUserId = req.params.id;

      console.log('Getting today sessions for mentor:', mentorUserId);

      // Tentukan rentang waktu hari ini
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const mentoringSessions = await Mentoring.findAll({
        where: {
          mentor_user_id: mentorUserId,
          jadwal: {
            [Op.between]: [startOfDay, endOfDay]
          }
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
            attributes: [
              'payment_id', 'order_id', 'payment_url',
              'transaction_status', 'gross_amount',
              'payment_type', 'paid_at'
            ],
            required: false
          }
        ],
        order: [['jadwal', 'ASC']]
      });

      console.log('Found today sessions:', mentoringSessions.length);

      const now = new Date();

      const formattedSessions = mentoringSessions.map(session => {
        const sessionDate = new Date(session.jadwal);
        const isDone = sessionDate < now;

        return {
          mentoring_id: session.mentoring_id,

          mentee: {
            user_id: session.mentee?.user_id,
            full_name: session.mentee?.full_name,
            email: session.mentee?.email,
            phone_number: session.mentee?.phone_number
          },

          jadwal: session.jadwal,
          tujuan_mentoring: session.tujuan_mentoring,
          metode_mentoring_id: session.metode_mentoring_id,
          status: isDone ? 'selesai' : 'terjadwal',

          payment_status: session.payment?.transaction_status || 'pending',
          is_paid: ['settlement', 'capture'].includes(session.payment?.transaction_status),

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

      res.json({
        success: true,
        message: 'Today mentoring sessions retrieved successfully',
        data: {
          sessions: formattedSessions,
          count: formattedSessions.length
        }
      });

    } catch (error) {
      console.error('Get today mentor sessions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get today sessions',
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

  static async getPointHistory(req, res) {
    try {
      const userId = req.params.id;

      // Ambil periode dari query ?start=2025-09-01&end=2025-10-31
      const { start, end } = req.query;

      const dateRange = {
        [Op.between]: [start, end]
      };

      // --- 1. Skor Swara ---
      const skorSwara = await SkorSwara.findAll({
        where: { user_id: userId, created_at: dateRange },
        attributes: ["point_earned", "created_at"]
      });

      // --- 2. Adu Swara ---
      const aduSwara = await MatchResult.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Match,
            as: "match",
            attributes: ["created_at"],
            where: { created_at: dateRange }
          }
        ],
        attributes: ["point_earned"]
      });

      // --- 3. Podium Swara ---
      const podium = await ProgressPodium.findAll({
        include: [
          {
            model: PodiumSession,
            as: "session",
            attributes: ["created_at"],
            where: { user_id: userId, created_at: dateRange }
          }
        ],
        attributes: ["point_earned"]
      });

      // helper format ke YYYY-MM-DD
      const toDateKey = (date) =>
        new Date(date).toISOString().slice(0, 10);

      // gabungkan semua ke dictionary
      const history = {};

      // Skor Swara
      skorSwara.forEach((x) => {
        const date = toDateKey(x.created_at);
        history[date] = (history[date] || 0) + x.point_earned;
      });

      // Adu Swara
      aduSwara.forEach((x) => {
        const date = toDateKey(x.match.created_at);
        history[date] = (history[date] || 0) + x.point_earned;
      });

      // Podium Swara
      podium.forEach((x) => {
        const date = toDateKey(x.session.created_at);
        history[date] = (history[date] || 0) + x.point_earned;
      });

      // Ubah ke array terurut
      const result = Object.keys(history)
        .sort()
        .map((date) => ({
          date,
          point: history[date],
        }));

      return res.json({
        status: "success",
        data: result,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }

  static async getAverageAspects(req, res) {
    try {
      const userId = req.params.id;

      // --- Adu Swara ---
      const adu = await sequelize.query(
        `
      SELECT 
        COUNT(*) AS total,
        SUM(tempo) AS tempo,
        SUM(artikulasi) AS artikulasi,
        SUM(kontak_mata) AS kontak_mata,
        SUM(kesesuaian_topik) AS kesesuaian_topik,
        SUM(struktur) AS struktur
      FROM match_results
      WHERE user_id = :userId
      `,
        { type: QueryTypes.SELECT, replacements: { userId } }
      );

      // --- Skor Swara ---
      const skor = await sequelize.query(
        `
      SELECT 
        COUNT(*) AS total,
        SUM(tempo) AS tempo,
        SUM(artikulasi) AS artikulasi,
        SUM(kontak_mata) AS kontak_mata,
        SUM(kesesuaian_topik) AS kesesuaian_topik,
        SUM(struktur) AS struktur
      FROM skor_swara
      WHERE user_id = :userId
      `,
        { type: QueryTypes.SELECT, replacements: { userId } }
      );

      // --- Podium Swara ---
      const podium = await sequelize.query(
        `
      SELECT 
        COUNT(*) AS total,
        SUM(tempo) AS tempo,
        SUM(artikulasi) AS artikulasi,
        SUM(kontak_mata) AS kontak_mata,
        SUM(kesesuaian_topik) AS kesesuaian_topik,
        SUM(struktur) AS struktur
      FROM progress_podium
      WHERE podium_session_id IN (
          SELECT podium_session_id FROM podium_sessions WHERE user_id = :userId
      )
      `,
        { type: QueryTypes.SELECT, replacements: { userId } }
      );

      // Total penilaian
      const totalPenilaian =
        Number(adu[0].total || 0) +
        Number(skor[0].total || 0) +
        Number(podium[0].total || 0);

      if (totalPenilaian === 0) {
        return res.json({
          success: true,
          data: {
            tempo: 0,
            artikulasi: 0,
            kontak_mata: 0,
            kesesuaian_topik: 0,
            struktur: 0,
          },
        });
      }

      // Helper sum
      const total = (a, b, c) => Number(a || 0) + Number(b || 0) + Number(c || 0);

      // Hitung total aspek
      const sumTempo = total(adu[0].tempo, skor[0].tempo, podium[0].tempo);
      const sumArtikulasi = total(adu[0].artikulasi, skor[0].artikulasi, podium[0].artikulasi);
      const sumKontak = total(adu[0].kontak_mata, skor[0].kontak_mata, podium[0].kontak_mata);
      const sumKesesuaian = total(adu[0].kesesuaian_topik, skor[0].kesesuaian_topik, podium[0].kesesuaian_topik);
      const sumStruktur = total(adu[0].struktur, skor[0].struktur, podium[0].struktur);

      // Rata-rata (maksimal 5)
      const avg = (value) => Math.min(5, Number((value / totalPenilaian).toFixed(2)));

      const result = {
        tempo: avg(sumTempo),
        artikulasi: avg(sumArtikulasi),
        kontak_mata: avg(sumKontak),
        kesesuaian_topik: avg(sumKesesuaian),
        struktur: avg(sumStruktur),
      };

      res.json({
        success: true,
        totalPenilaian,
        data: result,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  static async getPointSummary(req, res) {
    try {
      const userId = req.params.id;

      // SKOR SWARA
      const skorTotal = await SkorSwara.sum("point_earned", {
        where: {
          user_id: userId,
          status: "complete"
        }
      });

      // ADU SWARA
      const aduTotal = await MatchResult.sum("point_earned", {
        where: { user_id: userId }
      });

      // PODIUM – FIX ONLY_FULL_GROUP_BY
      const podiumQuery = await sequelize.query(
        `
        SELECT SUM(pp.point_earned) AS total
        FROM progress_podium pp
        JOIN podium_sessions ps 
            ON pp.podium_session_id = ps.podium_session_id
        WHERE ps.user_id = :userId
      `,
        {
          type: QueryTypes.SELECT,
          replacements: { userId }
        }
      );

      const podiumTotal = podiumQuery[0]?.total || 0;

      return res.json({
        status: true,
        data: {
          skor_swara: skorTotal || 0,
          adu_swara: aduTotal || 0,
          podium: podiumTotal
        }
      });

    } catch (err) {
      console.error("Error getting point summary:", err);
      res.status(500).json({
        status: false,
        message: "Internal server error",
        error: err.message
      });
    }
  }

  static async getCategorySummary(req, res) {
    try {
      const userId = req.params.id;

      // ambil rows dari skor_swara (status complete)
      const skorRows = await SkorSwara.findAll({
        where: { user_id: userId, status: "complete" },
        attributes: [
          "tempo", "artikulasi", "kontak_mata", "kesesuaian_topik", "struktur",
          "jeda", "first_impression", "ekspresi", "gestur", "kata_pengisi",
          "created_at"
        ],
        raw: true
      });

      // ambil rows dari match_results (adu swara)
      const aduRows = await MatchResult.findAll({
        where: { user_id: userId },
        attributes: [
          "tempo", "artikulasi", "kontak_mata", "kesesuaian_topik", "struktur",
          "jeda", "first_impression", "ekspresi", "gestur", "kata_pengisi",
          // created_at is in matchs, we need join to get created_at from matchs
          "match_id"
        ],
        raw: true
      });

      // ambil created_at untuk tiap match_id (minimalkan query dengan map)
      const matchIds = [...new Set(aduRows.map(r => r.match_id).filter(Boolean))];
      let matchCreatedMap = {};
      if (matchIds.length > 0) {
        // const { QueryTypes } = require("sequelize");
        // const sequelize = require("../config/database"); // sesuaikan path config db-mu
        const rows = await sequelize.query(
          `SELECT match_id, created_at FROM matchs WHERE match_id IN (:ids)`,
          { type: QueryTypes.SELECT, replacements: { ids: matchIds } }
        );
        rows.forEach(r => { matchCreatedMap[r.match_id] = r.created_at; });
      }
      // attach created_at to aduRows
      const aduRowsWithDate = aduRows.map(r => ({
        ...r,
        created_at: matchCreatedMap[r.match_id] || null
      }));

      // podium: progress_podium join podium_sessions untuk user_id
      const podiumRowsRaw = await ProgressPodium.findAll({
        attributes: [
          "tempo", "artikulasi", "kontak_mata", "kesesuaian_topik", "struktur",
          "jeda", "first_impression", "ekspresi", "gestur", "kata_pengisi",
          "point_earned", "podium_session_id"
        ],
        raw: true
      });

      // filter podiumRows by sessions owned by user and attach created_at
      const podiumSessionIds = [...new Set(podiumRowsRaw.map(r => r.podium_session_id).filter(Boolean))];
      let podiumSessionMap = {};
      if (podiumSessionIds.length > 0) {
        // const { QueryTypes } = require("sequelize");
        // const sequelize = require("../config/db"); // sesuaikan path config db-mu
        const rows = await sequelize.query(
          "SELECT podium_session_id, user_id, created_at FROM podium_sessions WHERE podium_session_id IN (:ids)",
          { type: QueryTypes.SELECT, replacements: { ids: podiumSessionIds } }
        );
        rows.forEach(r => { podiumSessionMap[r.podium_session_id] = r; });
      }

      const podiumRows = podiumRowsRaw
        .map(r => {
          const session = podiumSessionMap[r.podium_session_id];
          if (!session) return null; // not this user's session
          if (String(session.user_id) !== String(userId)) return null;
          return { ...r, created_at: session.created_at };
        })
        .filter(Boolean);

      // gabungkan semua rows
      const allRows = [
        ...skorRows,
        ...aduRowsWithDate,
        ...podiumRows
      ];

      if (allRows.length === 0) {
        return res.json({
          success: true,
          totalRows: 0,
          summary: { kognitif: null, afektif: null, psikomotorik: null },
          history: []
        });
      }

      // fungsi hitung kategori per row (menggunakan only available indicators)
      function computeCategoriesForRow(row) {
        // retrieve safely
        const tempo = safeNumber(row.tempo);
        const artikulasi = safeNumber(row.artikulasi);
        const kontak_mata = safeNumber(row.kontak_mata);
        const kesesuaian_topik = safeNumber(row.kesesuaian_topik);
        const struktur = safeNumber(row.struktur);
        const jeda = safeNumber(row.jeda);
        const first_impression = safeNumber(row.first_impression);
        const ekspresi = safeNumber(row.ekspresi);
        const gestur = safeNumber(row.gestur);
        const kata_pengisi = safeNumber(row.kata_pengisi);

        const kognitif = avgOfAvailable([kesesuaian_topik, struktur]);
        const afektif = avgOfAvailable([kontak_mata, first_impression, ekspresi]);
        const psikomotorik = avgOfAvailable([artikulasi, tempo, jeda, gestur, kata_pengisi]);

        return { kognitif, afektif, psikomotorik };
      }

      // summary aggregator
      let sumK = 0, sumA = 0, sumP = 0, countRows = 0;

      // history map per date
      const historyMap = {}; // date => { sumK, sumA, sumP, count }

      allRows.forEach(r => {
        const cats = computeCategoriesForRow(r);
        // if a row has all null categories (no indicators) skip it
        if (cats.kognitif === null && cats.afektif === null && cats.psikomotorik === null) return;

        countRows++;

        // use 0 for missing category when summing? NO — we should only add if not null,
        // but since final average across rows must be average of per-row category values,
        // if category is null for that row we should NOT count that row in that category's average.
        // To implement that, we will maintain separate counts per category below.
      });

      // better approach: maintain separate sums & counts per category
      let kSum = 0, kCount = 0;
      let aSum = 0, aCount = 0;
      let pSum = 0, pCount = 0;

      allRows.forEach(r => {
        const cats = computeCategoriesForRow(r);
        const createdAt = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null;

        if (cats.kognitif !== null) { kSum += cats.kognitif; kCount++; }
        if (cats.afektif !== null) { aSum += cats.afektif; aCount++; }
        if (cats.psikomotorik !== null) { pSum += cats.psikomotorik; pCount++; }

        if (createdAt) {
          if (!historyMap[createdAt]) historyMap[createdAt] = { kSum: 0, kCount: 0, aSum: 0, aCount: 0, pSum: 0, pCount: 0 };
          if (cats.kognitif !== null) { historyMap[createdAt].kSum += cats.kognitif; historyMap[createdAt].kCount++; }
          if (cats.afektif !== null) { historyMap[createdAt].aSum += cats.afektif; historyMap[createdAt].aCount++; }
          if (cats.psikomotorik !== null) { historyMap[createdAt].pSum += cats.psikomotorik; historyMap[createdAt].pCount++; }
        }
      });

      const summary = {
        kognitif: kCount === 0 ? null : round(kSum / kCount),
        afektif: aCount === 0 ? null : round(aSum / aCount),
        psikomotorik: pCount === 0 ? null : round(pSum / pCount)
      };

      const history = Object.entries(historyMap)
        .map(([date, v]) => ({
          date,
          kognitif: v.kCount === 0 ? null : round(v.kSum / v.kCount),
          afektif: v.aCount === 0 ? null : round(v.aSum / v.aCount),
          psikomotorik: v.pCount === 0 ? null : round(v.pSum / v.pCount)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      return res.json({
        success: true,
        totalRows: allRows.length,
        summary,
        history
      });

    } catch (err) {
      console.error("getCategorySummary error:", err);
      return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  }
}

module.exports = MentorController;