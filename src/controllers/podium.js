const { 
  PodiumCategory, 
  PodiumText, 
  PodiumInterviewQuestion,
  ProgressPodium,
  PodiumSession,
  sequelize 
} = require('../models');

class PodiumController {
  static async startPodium(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const userId = req.user.user_id;
      const activeSession = await PodiumSession.findOne({
        where: { user_id: userId, status: 'active' }
      });

      if (activeSession) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'You have an active session. Please complete or abandon it first.',
          data: {
            session_id: activeSession.session_id,
            started_at: activeSession.started_at
          }
        });
      }

      const categories = await PodiumCategory.findAll();
      if (categories.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'No categories available'
        });
      }

      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const sessionType = randomCategory.is_interview ? 'interview' : 'speech';
      let contentData = {};

      if (randomCategory.is_interview) {
        const questions = await PodiumInterviewQuestion.findAll({
          where: { category_id: randomCategory.podium_category_id },
          attributes: ['question_id', 'question'],
          order: sequelize.random(),
          limit: 5
        });

        if (questions.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'No interview questions available for this category'
          });
        }

        contentData = { questions: questions.map(q => q.toJSON()) };
      } else {
        const text = await PodiumText.findOne({
          where: { category_id: randomCategory.podium_category_id },
          attributes: ['podium_text_id', 'podium_text'],
          order: sequelize.random()
        });

        if (!text) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'No podium text available for this category'
          });
        }

        contentData = { text: text.toJSON() };
      }

      const session = await PodiumSession.create({
        user_id: userId,
        category_id: randomCategory.podium_category_id,
        session_type: sessionType,
        content_data: contentData,
        status: 'active',
        started_at: new Date()
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Podium session started successfully',
        data: {
          session_id: session.session_id,
          category_id: randomCategory.podium_category_id,
          category_name: randomCategory.podium_category,
          is_interview: randomCategory.is_interview,
          type: sessionType,
          started_at: session.started_at,
          ...contentData
        }
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: 'Failed to start podium session',
        error: error.message
      });
    }
  }

  static async submitPodiumResult(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user.user_id;
      const { session_id, self_confidence, time_management, audiens_interest, sentence_structure } = req.body;

      const session = await PodiumSession.findOne({
        where: { session_id, user_id: userId, status: 'active' },
        include: [{ model: PodiumCategory, as: 'category', attributes: ['podium_category_id', 'podium_category'] }]
      });

      if (!session) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired session. Please start a new session.'
        });
      }

      const sessionAge = (new Date() - new Date(session.started_at)) / 1000 / 60;
      if (sessionAge > 60) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Session has expired. Please start a new session.',
          data: { session_age_minutes: Math.round(sessionAge) }
        });
      }

      const scores = [self_confidence, time_management, audiens_interest, sentence_structure];
      if (!scores.every(score => typeof score === 'number' && score >= 0 && score <= 100)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'All scores must be numbers between 0 and 100'
        });
      }

      const progress = await ProgressPodium.create({
        user_id: userId,
        category_id: session.category_id,
        self_confidence,
        time_management,
        audiens_interest,
        sentence_structure,
        created_at: new Date()
      }, { transaction });

      await session.update({
        status: 'completed',
        completed_at: new Date(),
        progress_id: progress.progress_podium_id
      }, { transaction });

      await transaction.commit();

      const averageScore = (self_confidence + time_management + audiens_interest + sentence_structure) / 4;
      const practiceDuration = Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 1000 / 60);

      res.json({
        success: true,
        message: 'Podium result submitted successfully',
        data: {
          progress_id: progress.progress_podium_id,
          session_id: session.session_id,
          category: session.category.podium_category,
          scores: {
            self_confidence,
            time_management,
            audiens_interest,
            sentence_structure,
            average: parseFloat(averageScore.toFixed(2))
          },
          practice_duration_minutes: practiceDuration,
          started_at: session.started_at,
          completed_at: session.completed_at
        }
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: 'Failed to submit podium result',
        error: error.message
      });
    }
  }

  static async getProgress(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: progressList } = await ProgressPodium.findAndCountAll({
        where: { user_id: userId },
        include: [{ model: PodiumCategory, as: 'category', attributes: ['podium_category_id', 'podium_category', 'is_interview'] }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
      });

      let stats = {
        total_sessions: count,
        average_scores: { self_confidence: 0, time_management: 0, audiens_interest: 0, sentence_structure: 0, overall: 0 }
      };

      if (count > 0) {
        const allProgress = await ProgressPodium.findAll({
          where: { user_id: userId },
          attributes: [
            [sequelize.fn('AVG', sequelize.col('self_confidence')), 'avg_confidence'],
            [sequelize.fn('AVG', sequelize.col('time_management')), 'avg_time'],
            [sequelize.fn('AVG', sequelize.col('audiens_interest')), 'avg_interest'],
            [sequelize.fn('AVG', sequelize.col('sentence_structure')), 'avg_structure']
          ],
          raw: true
        });

        if (allProgress[0]) {
          stats.average_scores = {
            self_confidence: parseFloat(allProgress[0].avg_confidence || 0).toFixed(2),
            time_management: parseFloat(allProgress[0].avg_time || 0).toFixed(2),
            audiens_interest: parseFloat(allProgress[0].avg_interest || 0).toFixed(2),
            sentence_structure: parseFloat(allProgress[0].avg_structure || 0).toFixed(2)
          };

          const overall = (parseFloat(stats.average_scores.self_confidence) + parseFloat(stats.average_scores.time_management) + parseFloat(stats.average_scores.audiens_interest) + parseFloat(stats.average_scores.sentence_structure)) / 4;
          stats.average_scores.overall = parseFloat(overall.toFixed(2));
        }
      }

      res.json({
        success: true,
        message: 'Progress retrieved successfully',
        data: {
          statistics: stats,
          progress: progressList,
          pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get progress',
        error: error.message
      });
    }
  }

  static async getProgressDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const progress = await ProgressPodium.findOne({
        where: { progress_podium_id: id, user_id: userId },
        include: [{ model: PodiumCategory, as: 'category', attributes: ['podium_category_id', 'podium_category', 'is_interview'] }]
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: 'Progress not found'
        });
      }

      const session = await PodiumSession.findOne({
        where: { progress_id: id },
        attributes: ['session_id', 'started_at', 'completed_at', 'content_data']
      });

      const averageScore = (progress.self_confidence + progress.time_management + progress.audiens_interest + progress.sentence_structure) / 4;
      let practiceDuration = null;
      if (session && session.completed_at) {
        practiceDuration = Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 1000 / 60);
      }

      res.json({
        success: true,
        message: 'Progress detail retrieved successfully',
        data: {
          ...progress.toJSON(),
          average_score: parseFloat(averageScore.toFixed(2)),
          practice_duration_minutes: practiceDuration,
          session_data: session ? { session_id: session.session_id, started_at: session.started_at, completed_at: session.completed_at, content_data: session.content_data } : null
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get progress detail',
        error: error.message
      });
    }
  }
}

module.exports = PodiumController;
