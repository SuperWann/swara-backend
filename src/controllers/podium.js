const {
  PodiumCategory,
  PodiumText,
  PodiumInterviewQuestion,
  PodiumInterviewResult,
  ProgressPodium,
  PodiumSession,
  sequelize,
  Mentee,
} = require('../models');
const cloudinary = require('cloudinary').v2;
const AudioExtractor = require('../utils/audioExtractor');
const fs = require("fs");
const axios = require('axios');
const FormData = require("form-data");
const { Op } = require("sequelize");

class PodiumController {
  static async getCategories(req, res) {
    try {
      const categories = await PodiumCategory.findAll({
        attributes: ['podium_category_id', 'podium_category', 'is_interview'],
        order: [['podium_category', 'ASC']]
      });

      if (categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No categories available'
        });
      }

      res.json({
        success: true,
        message: 'Categories retrieved successfully',
        data: {
          total: categories.length,
          categories
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get categories',
        error: error.message
      });
    }
  }

  static async getCategoryDetail(req, res) {
    try {
      const { id } = req.params;

      const category = await PodiumCategory.findByPk(id, {
        attributes: ['podium_category_id', 'podium_category', 'is_interview']
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      // Count available content for this category
      let contentCount = 0;
      if (category.is_interview) {
        contentCount = await PodiumInterviewQuestion.count({
          where: { podium_category_id: id }
        });
      } else {
        contentCount = await PodiumText.count({
          where: { podium_category_id: id }
        });
      }

      res.json({
        success: true,
        message: 'Category detail retrieved successfully',
        data: {
          ...category.toJSON(),
          available_content: contentCount
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get category detail',
        error: error.message
      });
    }
  }

  static async startPidatoPodium(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { podium_category_id } = req.body;

      if (!podium_category_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Category ID is required'
        });
      }

      const category = await PodiumCategory.findByPk(podium_category_id);

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }

      let topicId = null;
      let topic = null;
      let text = null;

      if (category.podium_category === 'Pidato') {
        const topics = await PodiumText.findAll({
          attributes: ['podium_text_id', 'topic', 'text'],
        });

        if (topics.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: 'No topics available for this category'
          });
        }

        const randomIndex = Math.floor(Math.random() * topics.length);
        topicId = topics[randomIndex].podium_text_id;
        topic = topics[randomIndex].topic;
        text = topics[randomIndex].text;
      } else {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Here is pidato version'
        });
      }

      const podiumSession = await PodiumSession.create({
        user_id: userId,
        podium_category_id: podium_category_id,
        podium_text_id: topicId,
      }, { transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: 'Podium started successfully',
        data: {
          podiumSession,
          topic,
          text
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

  static async submitHasilPidatoPodium(req, res) {
    let extracted = null;
    let tempVideoPath = null;
    let tempAudioPath = null;

    try {
      const userId = req.user.user_id;
      let level = 1;

      const user = await Mentee.findByPk(userId);

      console.log(user);

      const point = user.point;
      console.log("point latihan:", point);

      if (point <= 200) level = 1;
      else if (point > 200 && point <= 500) level = 2;
      else if (point > 500 && point <= 900) level = 3;
      else if (point > 900 && point <= 1800) level = 4;
      else if (point > 1800) level = 5;

      console.log("level latihan:", level);

      const podium_session_id = await PodiumSession.max('podium_session_id', { where: { user_id: userId } });
      console.log(podium_session_id);

      const podiumSession = await PodiumSession.findByPk(podium_session_id, {
        include: [
          {
            model: PodiumCategory,
            as: 'podium_category'
          },
          {
            model: PodiumText,
            as: 'podium_text',
            attributes: ['podium_text_id', 'topic', 'text']
          }
        ]
      });
      console.log(podiumSession);

      if (!podiumSession) {
        return res.status(404).json({
          success: false,
          message: 'Podium session not found'
        });
      }

      // Pastikan file ada
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      // 1️⃣ Upload video ke Cloudinary
      const uploadToCloudinary = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "swara-videos"
      });

      const videoUrl = uploadToCloudinary.secure_url;

      // 4️⃣ Extract audio
      extracted = await AudioExtractor.extractFromCloudinary(videoUrl);

      tempVideoPath = extracted.videoPath;
      tempAudioPath = extracted.audioPath;

      console.log("✅ Audio berhasil diekstrak");
      console.log("📁 Video path:", tempVideoPath);
      console.log("📁 Audio path:", tempAudioPath);

      if (!fs.existsSync(tempAudioPath)) {
        throw new Error("File audio tidak ditemukan");
      }

      // ========================================
      // 🚀 PARALLEL PROCESSING - VIDEO & AUDIO
      // ========================================

      // Helper function untuk polling result
      const checkResult = async (taskId, baseUrl, maxAttempts = 100, delayMs = 2000) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const response = await axios.get(`${baseUrl}/${taskId}`);

          if (response.data.result !== null) return response.data;

          if (response.data.status === "failed") {
            throw new Error(`Analysis failed: ${response.data.error}`);
          }

          await new Promise((r) => setTimeout(r, delayMs));
        }

        throw new Error("Timeout waiting for result");
      };

      // Fungsi untuk analisis video
      const analyzeVideo = async () => {
        console.log("🎥 Starting video analysis...");
        const videoResponse = await axios.get(videoUrl, { responseType: "stream" });

        const videoData = new FormData();
        videoData.append("video", videoResponse.data, {
          filename: "video.mp4",
          contentType: "video/mp4",
        });
        videoData.append("level", level);

        const uploadVideoResponse = await axios.post(
          "https://cyberlace-swara-api.hf.space/api/v1/analyze",
          videoData,
          {
            headers: { ...videoData.getHeaders() },
          }
        );

        const { task_id } = uploadVideoResponse.data;
        const result = await checkResult(
          task_id,
          "https://cyberlace-swara-api.hf.space/api/v1/task"
        );
        console.log("✅ Video analysis completed");
        return result;
      };

      // Fungsi untuk analisis audio
      const analyzeAudio = async () => {
        console.log("🎵 Starting audio analysis...");
        const audioData = new FormData();
        audioData.append("audio", fs.createReadStream(tempAudioPath), {
          filename: "extracted_audio.wav",
          contentType: "audio/wav",
        });

        audioData.append("custom_topic", podiumSession.podium_text.topic || "");
        audioData.append("reference_text", podiumSession.podium_text.text || "");

        const uploadAudioResponse = await axios.post(
          "https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/analyze",
          audioData,
          {
            headers: { ...audioData.getHeaders() },
          }
        );

        const audio = uploadAudioResponse.data;
        const result = await checkResult(
          audio.task_id,
          "https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/status"
        );
        console.log("✅ Audio analysis completed");
        return result;
      };

      // 🚀 Jalankan analisis video dan audio secara paralel
      const [videoResult, audioResult] = await Promise.all([
        analyzeVideo(),
        analyzeAudio()
      ]);

      console.log("✅ Both analyses completed successfully");

      // ========================================
      // SCORING LOGIC
      // ========================================

      let tempo = 0;
      let artikulasi = 0;
      let kontak_mata = 0;
      let kesesuaian_topik = 0;
      let struktur = 0;

      let jeda = 0;
      let first_impression = 0;
      let ekspresi = 0;
      let gestur = 0;
      let kata_pengisi = 0;
      let kata_tidak_senonoh = 0;

      // PENILAIAN LEVEL 1 
      if (level === 1) {

        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? 0 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : 0;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 1 : 0;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 1 : 0;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.25 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else if (level === 2) {

        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;

        jeda = audioResult.result.tempo.has_long_pause ? -1 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -1;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 1 : 0;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 1 : -1;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.5 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else if (level === 3) {

        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -2;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 2 : -1;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else if (level === 4) {

        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -3;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 2 : -2;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1.5 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else {

        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;
        struktur = audioResult.result.structure?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -5 : 3;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -5;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 5 : -5;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 0 : -5;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -2 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      }

      // Hitung total point earned
      const pointEarned =
        tempo +
        artikulasi +
        kontak_mata +
        kesesuaian_topik +
        struktur +
        jeda +
        first_impression +
        ekspresi +
        gestur +
        kata_pengisi +
        kata_tidak_senonoh;

      const progressPodium = await ProgressPodium.create({
        podium_session_id: podiumSession.podium_session_id,
        point_earned: pointEarned,
        tempo,
        artikulasi,
        kontak_mata,
        kesesuaian_topik,
        struktur,
        jeda,
        first_impression,
        ekspresi,
        gestur,
        kata_pengisi,
        kata_tidak_senonoh,
        video_url: videoUrl
      });

      await Mentee.update({
        point: sequelize.literal(`point + ${pointEarned}`),
      }, {
        where: { mentee_id: userId },
      }
      );

      res.json({
        success: true,
        message: 'Hasil podium session submitted successfully',
        data: progressPodium
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to submit hasil podium session',
        error: error.message
      });
    }
  }

  // static async startPodium(req, res) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     const userId = req.user.user_id;
  //     const { podium_category_id } = req.body;

  //     if (!podium_category_id) {
  //       await transaction.rollback();
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Category ID is required'
  //       });
  //     }

  //     // Check for active session
  //     const activeSession = await PodiumSession.findOne({
  //       where: { user_id: userId, status: 'active' }
  //     });

  //     if (activeSession) {
  //       await transaction.rollback();
  //       return res.status(400).json({
  //         success: false,
  //         message: 'You have an active session. Please complete or abandon it first.',
  //         data: {
  //           session_id: activeSession.session_id,
  //           started_at: activeSession.started_at
  //         }
  //       });
  //     }

  //     // Get selected category
  //     const selectedCategory = await PodiumCategory.findByPk(podium_category_id);

  //     if (!selectedCategory) {
  //       await transaction.rollback();
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Category not found'
  //       });
  //     }

  //     const sessionType = selectedCategory.is_interview ? 'interview' : 'speech';
  //     let contentData = {};

  //     if (selectedCategory.is_interview) {
  //       const questions = await PodiumInterviewQuestion.findAll({
  //         where: { podium_category_id: selectedCategory.podium_category_id },
  //         attributes: ['podium_interview_question_id', 'question'],
  //         order: sequelize.random(),
  //         limit: 5
  //       });

  //       if (questions.length === 0) {
  //         await transaction.rollback();
  //         return res.status(404).json({
  //           success: false,
  //           message: 'No interview questions available for this category'
  //         });
  //       }

  //       contentData = { questions: questions.map(q => q.toJSON()) };
  //     } else {
  //       const text = await PodiumText.findOne({
  //         where: { podium_category_id: selectedCategory.podium_category_id },
  //         attributes: ['podium_text_id', 'podium_text'],
  //         order: sequelize.random()
  //       });

  //       if (!text) {
  //         await transaction.rollback();
  //         return res.status(404).json({
  //           success: false,
  //           message: 'No podium text available for this category'
  //         });
  //       }

  //       contentData = { text: text.toJSON() };
  //     }

  //     const session = await PodiumSession.create({
  //       user_id: userId,
  //       podium_category_id: selectedCategory.podium_category_id,
  //       session_type: sessionType,
  //       content_data: contentData,
  //       status: 'active',
  //       started_at: new Date()
  //     }, { transaction });

  //     await transaction.commit();

  //     res.json({
  //       success: true,
  //       message: 'Podium session started successfully',
  //       data: {
  //         session_id: session.session_id,
  //         podium_category_id: selectedCategory.podium_category_id,
  //         category_name: selectedCategory.podium_category,
  //         is_interview: selectedCategory.is_interview,
  //         type: sessionType,
  //         started_at: session.started_at,
  //         ...contentData
  //       }
  //     });
  //   } catch (error) {
  //     await transaction.rollback();
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to start podium session',
  //       error: error.message
  //     });
  //   }
  // }

  // static async submitPodiumResult(req, res) {
  //   const transaction = await sequelize.transaction();
  //   try {
  //     const userId = req.user.user_id;
  //     const { session_id, self_confidence, time_management, audiens_interest, sentence_structure } = req.body;

  //     const session = await PodiumSession.findOne({
  //       where: { session_id, user_id: userId, status: 'active' },
  //       include: [{ model: PodiumCategory, as: 'category', attributes: ['podium_category_id', 'podium_category'] }]
  //     });

  //     if (!session) {
  //       await transaction.rollback();
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Invalid or expired session. Please start a new session.'
  //       });
  //     }

  //     const sessionAge = (new Date() - new Date(session.started_at)) / 1000 / 60;
  //     if (sessionAge > 60) {
  //       await transaction.rollback();
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Session has expired. Please start a new session.',
  //         data: { session_age_minutes: Math.round(sessionAge) }
  //       });
  //     }

  //     const scores = [self_confidence, time_management, audiens_interest, sentence_structure];
  //     if (!scores.every(score => typeof score === 'number' && score >= 0 && score <= 100)) {
  //       await transaction.rollback();
  //       return res.status(400).json({
  //         success: false,
  //         message: 'All scores must be numbers between 0 and 100'
  //       });
  //     }

  //     const progress = await ProgressPodium.create({
  //       user_id: userId,
  //       podium_category_id: session.podium_category_id,
  //       self_confidence,
  //       time_management,
  //       audiens_interest,
  //       sentence_structure,
  //       created_at: new Date()
  //     }, { transaction });

  //     await session.update({
  //       status: 'completed',
  //       completed_at: new Date(),
  //       progress_id: progress.progress_podium_id
  //     }, { transaction });

  //     await transaction.commit();

  //     const averageScore = (self_confidence + time_management + audiens_interest + sentence_structure) / 4;
  //     const practiceDuration = Math.round((new Date(session.completed_at) - new Date(session.started_at)) / 1000 / 60);

  //     res.json({
  //       success: true,
  //       message: 'Podium result submitted successfully',
  //       data: {
  //         progress_id: progress.progress_podium_id,
  //         session_id: session.session_id,
  //         category: session.category.podium_category,
  //         scores: {
  //           self_confidence,
  //           time_management,
  //           audiens_interest,
  //           sentence_structure,
  //           average: parseFloat(averageScore.toFixed(2))
  //         },
  //         practice_duration_minutes: practiceDuration,
  //         started_at: session.started_at,
  //         completed_at: session.completed_at
  //       }
  //     });
  //   } catch (error) {
  //     await transaction.rollback();
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to submit podium result',
  //       error: error.message
  //     });
  //   }
  // }

  static async getProgress(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: progressList } = await PodiumSession.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: ProgressPodium,
            as: 'progress',
            attributes: [
              'progress_podium_id',
              'tempo',
              'artikulasi',
              'kontak_mata',
              'kesesuaian_topik',
              'struktur',
              'jeda',
              'first_impression',
              'ekspresi',
              'gestur',
              'kata_pengisi',
              'kata_tidak_senonoh',
              'point_earned'
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
      });

      let stats = {
        total_sessions: count,
        average_scores: {
          tempo: 0,
          artikulasi: 0,
          kontak_mata: 0,
          kesesuaian_topik: 0,
          struktur: 0,
          jeda: 0,
          first_impression: 0,
          ekspresi: 0,
          gestur: 0,
          kata_pengisi: 0,
          kata_tidak_senonoh: 0,
          overall: 0,
          total_points: 0
        }
      };

      if (count > 0) {
        const result = await ProgressPodium.findOne({
          include: [
            {
              model: PodiumSession,
              as: "session",
              where: { user_id: userId },
              attributes: []
            }
          ],
          attributes: [
            [sequelize.fn('AVG', sequelize.col('tempo')), 'avg_tempo'],
            [sequelize.fn('AVG', sequelize.col('artikulasi')), 'avg_artikulasi'],
            [sequelize.fn('AVG', sequelize.col('kontak_mata')), 'avg_kontak_mata'],
            [sequelize.fn('AVG', sequelize.col('kesesuaian_topik')), 'avg_kesesuaian_topik'],
            [sequelize.fn('AVG', sequelize.col('struktur')), 'avg_struktur'],
            [sequelize.fn('AVG', sequelize.col('jeda')), 'avg_jeda'],
            [sequelize.fn('AVG', sequelize.col('first_impression')), 'avg_first_impression'],
            [sequelize.fn('AVG', sequelize.col('ekspresi')), 'avg_ekspresi'],
            [sequelize.fn('AVG', sequelize.col('gestur')), 'avg_gestur'],
            [sequelize.fn('AVG', sequelize.col('kata_pengisi')), 'avg_kata_pengisi'],
            [sequelize.fn('AVG', sequelize.col('kata_tidak_senonoh')), 'avg_kata_tidak_senonoh'],
            [sequelize.fn('SUM', sequelize.col('point_earned')), 'total_points']
          ],
          raw: true
        });

        if (result) {
          stats.average_scores = {
            tempo: Number(result.avg_tempo || 0).toFixed(2),
            artikulasi: Number(result.avg_artikulasi || 0).toFixed(2),
            kontak_mata: Number(result.avg_kontak_mata || 0).toFixed(2),
            kesesuaian_topik: Number(result.avg_kesesuaian_topik || 0).toFixed(2),
            struktur: Number(result.avg_struktur || 0).toFixed(2),
            jeda: Number(result.avg_jeda || 0).toFixed(2),
            first_impression: Number(result.avg_first_impression || 0).toFixed(2),
            ekspresi: Number(result.avg_ekspresi || 0).toFixed(2),
            gestur: Number(result.avg_gestur || 0).toFixed(2),
            kata_pengisi: Number(result.avg_kata_pengisi || 0).toFixed(2),
            kata_tidak_senonoh: Number(result.avg_kata_tidak_senonoh || 0).toFixed(2),
            total_points: Number(result.total_points || 0),
            overall: Number(
              (
                (Number(result.avg_tempo || 0) +
                  Number(result.avg_artikulasi || 0) +
                  Number(result.avg_kontak_mata || 0) +
                  Number(result.avg_kesesuaian_topik || 0) +
                  Number(result.avg_struktur || 0) +
                  Number(result.avg_jeda || 0) +
                  Number(result.avg_first_impression || 0) +
                  Number(result.avg_ekspresi || 0) +
                  Number(result.avg_gestur || 0) +
                  Number(result.avg_kata_pengisi || 0) +
                  Number(result.avg_kata_tidak_senonoh || 0))
                / 11
              ).toFixed(2)
            )
          };
        }
      }

      res.json({
        success: true,
        message: 'Progress retrieved successfully',
        data: {
          statistics: stats,
          progress: progressList,
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

  static async getPodiumCategories(req, res) {
    try {
      const categories = await PodiumCategory.findAll({
        attributes: ['podium_category_id', 'podium_category'],
        order: [['podium_category', 'ASC']]
      });

      res.json({
        success: true,
        message: 'Podium categories retrieved successfully',
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get podium categories',
        error: error.message
      });
    }
  }

  static async createPodiumText(req, res) {
    try {
      const { podium_category_id, podium_text } = req.body;
      const newText = await PodiumText.create({ podium_category_id, podium_text, created_at: new Date() });

      res.status(201).json({
        success: true,
        message: 'Podium text created successfully',
        data: newText
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create podium text',
        error: error.message
      });
    }
  }

  static async getPodiumTextsByCategory(req, res) {
    try {
      const { id } = req.params;
      const podiumTexts = await PodiumText.findAll({
        where: { podium_category_id: id }
      });

      res.json({
        success: true,
        message: 'Podium texts retrieved successfully',
        data: podiumTexts
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

module.exports = PodiumController;
