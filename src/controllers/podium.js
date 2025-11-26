const { PodiumCategory, PodiumText, PodiumInterviewQuestion, PodiumInterviewResult, ProgressPodium, PodiumSession, sequelize, Mentee } = require("../models");
const cloudinary = require("cloudinary").v2;
const AudioExtractor = require("../utils/audioExtractor");
const fs = require("fs");
const chatgptService = require("../services/chatgptService");
const axios = require("axios");
const FormData = require("form-data");
const { Op } = require("sequelize");

class PodiumController {
  static async getCategories(req, res) {
    try {
      const categories = await PodiumCategory.findAll({
        attributes: ["podium_category_id", "podium_category", "is_interview"],
        order: [["podium_category", "ASC"]],
      });

      if (categories.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No categories available",
        });
      }

      res.json({
        success: true,
        message: "Categories retrieved successfully",
        data: {
          total: categories.length,
          categories,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get categories",
        error: error.message,
      });
    }
  }

  static async getCategoryDetail(req, res) {
    try {
      const { id } = req.params;

      const category = await PodiumCategory.findByPk(id, {
        attributes: ["podium_category_id", "podium_category", "is_interview"],
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Count available content for this category
      let contentCount = 0;
      if (category.is_interview) {
        contentCount = await PodiumInterviewQuestion.count({
          where: { podium_category_id: id },
        });
      } else {
        contentCount = await PodiumText.count({
          where: { podium_category_id: id },
        });
      }

      res.json({
        success: true,
        message: "Category detail retrieved successfully",
        data: {
          ...category.toJSON(),
          available_content: contentCount,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get category detail",
        error: error.message,
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
          message: "Category ID is required",
        });
      }

      const category = await PodiumCategory.findByPk(podium_category_id);

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      let topicId = null;
      let topic = null;
      let text = null;

      if (category.podium_category === "Pidato") {
        const topics = await PodiumText.findAll({
          attributes: ["podium_text_id", "topic", "text"],
        });

        if (topics.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "No topics available for this category",
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
          message: "Here is pidato version",
        });
      }

      const podiumSession = await PodiumSession.create(
        {
          user_id: userId,
          podium_category_id: podium_category_id,
          podium_text_id: topicId,
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Podium started successfully",
        data: {
          podiumSession,
          topic,
          text,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to start podium session",
        error: error.message,
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

      const podium_session_id = await PodiumSession.max("podium_session_id", { where: { user_id: userId } });
      console.log(podium_session_id);

      const podiumSession = await PodiumSession.findByPk(podium_session_id, {
        include: [
          {
            model: PodiumCategory,
            as: "podium_category",
          },
          {
            model: PodiumText,
            as: "podium_text",
            attributes: ["podium_text_id", "topic", "text"],
          },
        ],
      });
      console.log(podiumSession);

      if (!podiumSession) {
        return res.status(404).json({
          success: false,
          message: "Podium session not found",
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
        folder: "swara-videos",
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

        const uploadVideoResponse = await axios.post("https://cyberlace-swara-api.hf.space/api/v1/analyze", videoData, {
          headers: { ...videoData.getHeaders() },
        });

        const { task_id } = uploadVideoResponse.data;
        const result = await checkResult(task_id, "https://cyberlace-swara-api.hf.space/api/v1/task");
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

        audioData.append("custom_topic", podiumSession.podium_text.topic);
        audioData.append("reference_text", podiumSession.podium_text.text);

        const uploadAudioResponse = await axios.post("https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/analyze", audioData, {
          headers: { ...audioData.getHeaders() },
        });

        const audio = uploadAudioResponse.data;
        const result = await checkResult(audio.task_id, "https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/status");
        console.log("✅ Audio analysis completed");
        return result;
      };

      // 🚀 Jalankan analisis video dan audio secara paralel
      const [videoResult, audioResult] = await Promise.all([analyzeVideo(), analyzeAudio()]);

      console.log("✅ Both analyses completed successfully");

      let suggestions = null;

      try {
        suggestions = await chatgptService.generateSuggestions(videoResult, audioResult, level);
        console.log(suggestions);
      } catch (aiError) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate suggestions",
          error: aiError.message,
        });
      }

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
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : 0;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 1 : 0;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 1 : 0;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.25 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;
      } else if (level === 2) {
        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata =
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5
            ? 5
            : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8
              ? 4
              : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10
                ? 3
                : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12
                  ? 2
                  : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12
                    ? 1
                    : 0;

        jeda = audioResult.result.tempo.has_long_pause ? -1 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : -1;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 1 : 0;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 1 : -1;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.5 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;
      } else if (level === 3) {
        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata =
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5
            ? 5
            : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8
              ? 4
              : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10
                ? 3
                : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12
                  ? 2
                  : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12
                    ? 1
                    : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : -2;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 2 : -1;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;
      } else if (level === 4) {
        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata =
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5
            ? 5
            : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8
              ? 4
              : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10
                ? 3
                : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12
                  ? 2
                  : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12
                    ? 1
                    : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : -3;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 2 : -2;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1.5 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;
      } else {
        tempo = audioResult.result.tempo.score || 0;
        artikulasi = audioResult.result.articulation.score || 0;
        kontak_mata =
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5
            ? 5
            : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8
              ? 4
              : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10
                ? 3
                : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12
                  ? 2
                  : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12
                    ? 1
                    : 0;
        kesesuaian_topik = audioResult.result.keywords?.score || 0;
        struktur = audioResult.result.structure?.score || 0;

        jeda = audioResult.result.tempo.has_long_pause ? -5 : 3;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : -5;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 5 : -5;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 0 : -5;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -2 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;
      }

      const pointEarned = tempo + artikulasi + kontak_mata + kesesuaian_topik + struktur + jeda + first_impression + ekspresi + gestur + kata_pengisi + kata_tidak_senonoh;

      await ProgressPodium.create({
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
        video_url: videoUrl,
        result_ai: JSON.stringify(suggestions)
      });

      await Mentee.update(
        {
          point: sequelize.literal(`point + ${pointEarned}`),
        },
        {
          where: { mentee_id: userId },
        }
      );

      const newProgressPodium = await ProgressPodium.findOne({
        where: { podium_session_id: podiumSession.podium_session_id },
        order: [['progress_podium_id', 'DESC']]
      });

      let suggestionResults = null;

      try {
        suggestionResults = JSON.parse(newProgressPodium.result_ai);
      } catch (e) {
        suggestionResults = null;
      }

      const cleaned = newProgressPodium.toJSON();
      delete cleaned.result_ai;

      res.json({
        success: true,
        message: "Hasil podium session submitted successfully",
        data: {
          updatedData: cleaned,
          suggestions: suggestionResults
        }
      });
    } catch (error) {
      console.log(error.errors);
      res.status(500).json({
        success: false,
        message: "Failed to submit hasil podium session",
        error: error.message,
      });
    }
  }

  static async getProgress(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: progressList } = await PodiumSession.findAndCountAll({
        where: { user_id: userId },
        include: [
          // {
          //   model: ProgressPodium,
          //   as: 'progress',
          //   attributes: [
          //     'progress_podium_id',
          //     'tempo',
          //     'artikulasi',
          //     'kontak_mata',
          //     'kesesuaian_topik',
          //     'struktur',
          //     'jeda',
          //     'first_impression',
          //     'ekspresi',
          //     'gestur',
          //     'kata_pengisi',
          //     'kata_tidak_senonoh',
          //     'point_earned'
          //   ]
          // },
          {
            model: PodiumCategory,
            as: 'podium_category',
            attributes: ['podium_category_id', 'podium_category']
          },
          {
            model: PodiumText,
            as: 'podium_text',
            attributes: ['podium_text_id', 'topic', 'text']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
        distinct: true,
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
          raw: true,
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
        message: "Progress retrieved successfully",
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
        message: "Failed to get progress",
        error: error.message,
      });
    }
  }

  static async getProgressDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const progress = await PodiumSession.findOne({
        where: { podium_session_id: id, user_id: userId },
        include: [
          { model: PodiumCategory, as: 'podium_category', attributes: ['podium_category_id', 'podium_category'] },
          { model: PodiumText, as: 'podium_text', attributes: ['podium_text_id', 'topic', 'text'] },
          { model: ProgressPodium, as: 'progress', attributes: ['tempo', 'point_earned', 'artikulasi', 'kontak_mata', 'kesesuaian_topik', 'struktur', 'jeda', 'first_impression', 'ekspresi', 'gestur', 'kata_pengisi', 'kata_tidak_senonoh'] }
        ]
      });

      if (!progress) {
        return res.status(404).json({
          success: false,
          message: "Progress not found",
        });
      }

      res.json({
        success: true,
        message: 'Progress detail retrieved successfully, anjazz',
        data: progress
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get progress detail",
        error: error.message,
      });
    }
  }

  static async getPodiumCategories(req, res) {
    try {
      const categories = await PodiumCategory.findAll({
        attributes: ["podium_category_id", "podium_category"],
        order: [["podium_category", "ASC"]],
      });

      res.json({
        success: true,
        message: "Podium categories retrieved successfully",
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get podium categories",
        error: error.message,
      });
    }
  }

  static async createPodiumText(req, res) {
    try {
      const { podium_category_id, podium_text } = req.body;
      const newText = await PodiumText.create({ podium_category_id, podium_text, created_at: new Date() });

      res.status(201).json({
        success: true,
        message: "Podium text created successfully",
        data: newText,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create podium text",
        error: error.message,
      });
    }
  }

  static async getPodiumTextsByCategory(req, res) {
    try {
      const { id } = req.params;
      const podiumTexts = await PodiumText.findAll({
        where: { podium_category_id: id },
      });

      res.json({
        success: true,
        message: "Podium texts retrieved successfully",
        data: podiumTexts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get podium texts",
        error: error.message,
      });
    }
  }

  // ========================================
  // INTERVIEW METHODS
  // ========================================

  static async startInterview(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { podium_category_id } = req.body;

      if (!podium_category_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
      }

      // Validate category
      const category = await PodiumCategory.findByPk(podium_category_id, { transaction });

      if (!category) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      if (!category.is_interview) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "This category is not for interviews",
        });
      }

      // Get all questions for this category
      const questions = await PodiumInterviewQuestion.findAll({
        where: { podium_category_id },
        attributes: ["podium_interview_question_id", "question", "keywords"],
        order: [["podium_interview_question_id", "ASC"]],
        transaction,
      });

      if (questions.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "No interview questions available for this category",
        });
      }

      // Create session with podium_text_id = null for interview
      const session = await PodiumSession.create(
        {
          user_id: userId,
          podium_category_id,
          podium_text_id: null,
          created_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Interview session started successfully",
        data: {
          podium_session_id: session.podium_session_id,
          podium_category_id: session.podium_category_id,
          total_questions: questions.length,
          questions: questions.map((q) => ({
            podium_interview_question_id: q.podium_interview_question_id,
            question: q.question,
            keywords: q.keywords,
          })),
        },
      });
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      res.status(500).json({
        success: false,
        message: "Failed to start interview session",
        error: error.message,
      });
    }
  }

  static async submitAnswer(req, res) {
    let tempVideoPath = null;
    let tempAudioPath = null;

    try {
      const userId = req.user.user_id;
      const { podium_session_id, podium_interview_question_id } = req.body;

      // Validate request
      if (!podium_session_id || !podium_interview_question_id) {
        return res.status(400).json({
          success: false,
          message: "Session ID and Question ID are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      // Validate session
      const session = await PodiumSession.findOne({
        where: {
          podium_session_id,
          user_id: userId,
        },
        include: [
          {
            model: PodiumCategory,
            as: "podium_category",
            attributes: ["podium_category_id", "is_interview"],
          },
        ],
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      if (!session.podium_category.is_interview) {
        return res.status(400).json({
          success: false,
          message: "This session is not for interviews",
        });
      }

      // Validate question
      const question = await PodiumInterviewQuestion.findByPk(podium_interview_question_id);

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      // Check if already answered
      const existingAnswer = await PodiumInterviewResult.findOne({
        where: {
          podium_session_id,
          podium_interview_question_id,
        },
      });

      if (existingAnswer) {
        return res.status(400).json({
          success: false,
          message: "This question has already been answered in this session",
        });
      }

      console.log("🎵 Extracting audio from uploaded file...");

      // Extract audio from local file FIRST (before Cloudinary upload)
      const extracted = await AudioExtractor.extractFromLocalFile(req.file.path);
      tempVideoPath = extracted.videoPath; // This is req.file.path
      tempAudioPath = extracted.audioPath;

      console.log("✅ Audio extracted successfully");
      console.log("📁 Video path:", tempVideoPath);
      console.log("📁 Audio path:", tempAudioPath);

      console.log("📤 Uploading video to Cloudinary...");

      // Upload video to Cloudinary AFTER extraction
      const uploadToCloudinary = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "swara-videos/interviews",
      });

      const videoUrl = uploadToCloudinary.secure_url;
      console.log("✅ Video uploaded:", videoUrl);

      if (!fs.existsSync(tempAudioPath)) {
        throw new Error("Audio file not found after extraction");
      }

      // ========================================
      // PARALLEL PROCESSING - VIDEO & AUDIO
      // ========================================

      // Helper function for polling result
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

      // Video analysis function
      const analyzeVideo = async () => {
        console.log("🎥 Starting video analysis...");

        // Use local video file instead of downloading from Cloudinary
        const videoData = new FormData();
        videoData.append("video", fs.createReadStream(tempVideoPath), {
          filename: "video.mp4",
          contentType: "video/mp4",
        });
        videoData.append("level", 1); // No level system for interview

        const uploadVideoResponse = await axios.post("https://cyberlace-swara-api.hf.space/api/v1/analyze", videoData, {
          headers: { ...videoData.getHeaders() },
        });

        const { task_id } = uploadVideoResponse.data;
        const result = await checkResult(task_id, "https://cyberlace-swara-api.hf.space/api/v1/task");
        console.log("✅ Video analysis completed");
        return result;
      };

      // Audio analysis function
      const analyzeAudio = async () => {
        console.log("🎵 Starting audio analysis...");
        const audioData = new FormData();
        audioData.append("audio", fs.createReadStream(tempAudioPath), {
          filename: "extracted_audio.wav",
          contentType: "audio/wav",
        });

        // Prepare keywords from question
        const keywordsList = question.keywords ? question.keywords.split(",") : [];

        audioData.append("custom_topic", question.question || "");
        audioData.append("custom_keywords", JSON.stringify(keywordsList));

        console.log("📋 Keywords sent to AI:", keywordsList);

        const uploadAudioResponse = await axios.post("https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/analyze", audioData, {
          headers: { ...audioData.getHeaders() },
        });

        const audio = uploadAudioResponse.data;
        const result = await checkResult(audio.task_id, "https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/status");
        console.log("✅ Audio analysis completed");
        return result;
      };

      // Run parallel analysis
      const [videoResult, audioResult] = await Promise.all([analyzeVideo(), analyzeAudio()]);

      console.log("✅ Both analyses completed successfully");
      console.log("========================================");
      console.log("📊 AI ANALYSIS RESULTS:");
      console.log("========================================");
      console.log("🎥 VIDEO RESULT:", JSON.stringify(videoResult.result.analysis_results, null, 2));
      console.log("========================================");
      console.log("🎵 AUDIO RESULT:", JSON.stringify(audioResult.result, null, 2));
      console.log("========================================");

      // ========================================
      // EXTRACT SCORES FROM AI RESULTS
      // ========================================

      const tempo = audioResult.result.tempo.score || 0;
      const artikulasi = audioResult.result.articulation.score || 0;
      const kontak_mata =
        videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5
          ? 5
          : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8
            ? 4
            : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10
              ? 3
              : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 && videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12
                ? 2
                : videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12
                  ? 1
                  : 0;

      const kesesuaian_topik = audioResult.result.keywords?.score || 0;
      const struktur = audioResult.result.structure?.score || 0;
      const jeda = audioResult.result.tempo.has_long_pause ? -1 : 1;
      const first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === "Happy" ? 1 : 0;
      const ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === "Happy" ? 1 : 0;
      const gestur = videoResult.result.analysis_results.gesture.score >= 7 && !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected ? 1 : 0;
      const kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.25 : 1;
      const kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      // Format keywords for response (mentioned_count/total_keywords)
      const keywordsData = audioResult.result.keywords || {};
      const mentionedCount = keywordsData.mentioned_count || 0;
      const totalKeywords = keywordsData.total_keywords || 0;
      const keywordsFormatted = `${mentionedCount}/${totalKeywords}`;

      // Save result to database (including keywords_score)
      const interviewResult = await PodiumInterviewResult.create({
        podium_session_id,
        podium_interview_question_id,
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
        point_earned: 0, // Not used for interviews
        video_url: videoUrl,
        keywords_score: keywordsFormatted,
      });

      // Get question number for response
      const allQuestions = await PodiumInterviewQuestion.findAll({
        where: { podium_category_id: session.podium_category_id },
        order: [["podium_interview_question_id", "ASC"]],
      });

      const questionNumber = allQuestions.findIndex((q) => q.podium_interview_question_id === parseInt(podium_interview_question_id)) + 1;

      res.json({
        success: true,
        message: `Answer for question ${questionNumber} submitted successfully`,
        data: {
          interview_result_id: interviewResult.interview_result_id,
          question_number: questionNumber,
          total_questions: allQuestions.length,
          video_url: videoUrl,
          main_scores: {
            tempo,
            artikulasi,
            kontak_mata,
            keywords: keywordsFormatted,
          },
          bonus_penalty: {
            jeda,
            first_impression,
            ekspresi,
            gestur,
            kata_pengisi,
            kata_tidak_senonoh,
          },
        },
      });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit answer",
        error: error.message,
      });
    } finally {
      // Cleanup temporary files
      console.log("🗑️ Cleaning up temporary files...");

      if (tempAudioPath) {
        try {
          if (fs.existsSync(tempAudioPath)) {
            fs.unlinkSync(tempAudioPath);
            console.log("✅ Audio file deleted");
          }
        } catch (err) {
          console.error("⚠️ Failed to delete audio:", err.message);
        }
      }

      if (tempVideoPath) {
        try {
          if (fs.existsSync(tempVideoPath)) {
            fs.unlinkSync(tempVideoPath);
            console.log("✅ Video file deleted");
          }
        } catch (err) {
          console.error("⚠️ Failed to delete video:", err.message);
        }
      }

      // Delete uploaded file from multer
      if (req.file && req.file.path) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
            console.log("✅ Uploaded file deleted");
          }
        } catch (err) {
          console.error("⚠️ Failed to delete uploaded file:", err.message);
        }
      }
    }
  }

  static async getInterviewResult(req, res) {
    try {
      const { podium_session_id } = req.params;
      const userId = req.user.user_id;

      // Validate session
      const session = await PodiumSession.findOne({
        where: {
          podium_session_id,
          user_id: userId,
        },
        include: [
          {
            model: PodiumCategory,
            as: "podium_category",
            attributes: ["podium_category_id", "podium_category", "is_interview"],
          },
        ],
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Get all results for this session
      const results = await PodiumInterviewResult.findAll({
        where: { podium_session_id },
        include: [
          {
            model: PodiumInterviewQuestion,
            as: "question",
            attributes: ["podium_interview_question_id", "question", "keywords"],
          },
        ],
        order: [["podium_interview_question_id", "ASC"]],
      });

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No results found for this session",
        });
      }

      // Format response
      const formattedResults = results.map((result, index) => {
        // Use keywords_score from database if available, otherwise fallback to score
        const keywordsDisplay = result.keywords_score || (result.kesesuaian_topik !== null && result.kesesuaian_topik !== undefined ? `Score: ${result.kesesuaian_topik}` : "N/A");

        return {
          question_number: index + 1,
          question: result.question.question,
          keywords_list: result.question.keywords,
          video_url: result.video_url,
          main_scores: {
            tempo: result.tempo,
            artikulasi: result.artikulasi,
            kontak_mata: result.kontak_mata,
            keywords: keywordsDisplay,
          },
          bonus_penalty: {
            jeda: result.jeda,
            first_impression: result.first_impression,
            ekspresi: result.ekspresi,
            gestur: result.gestur,
            kata_pengisi: result.kata_pengisi,
            kata_tidak_senonoh: result.kata_tidak_senonoh,
          },
        };
      });

      res.json({
        success: true,
        message: "Interview results retrieved successfully",
        data: {
          podium_session_id: session.podium_session_id,
          category: session.podium_category.podium_category,
          total_questions_answered: results.length,
          results: formattedResults,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get interview results",
        error: error.message,
      });
    }
  }
}

module.exports = PodiumController;
