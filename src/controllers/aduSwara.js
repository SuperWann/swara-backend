const {
  AduSwaraCategory,
  AduSwaraTopic,
  Keyword,
  AduSwaraKeyword,
  Match,
  MatchResult,
  User,
  Mentee,
  ContentSwara,
  sequelize,
} = require("../models");
const { DAILY_KEY } = require("../config/Daily")
const { Op } = require("sequelize");
const { cloudinary } = require("../config/cloudinary");
const AudioExtractor = require('../utils/audioExtractor');
const fs = require("fs");
const axios = require('axios');
const FormData = require("form-data");

class AduSwaraController {
  static async getDashboard(req, res) {
    try {
      const userId = req.user.user_id;

      const totalMatches = await MatchResult.count({
        where: { user_id: userId },
      });

      const matches = await MatchResult.findAll({
        where: { user_id: userId },
        include: [
          {
            model: Match,
            as: "match",
            include: [
              {
                model: MatchResult,
                as: "results",
                where: {
                  user_id: { [Op.ne]: userId },
                },
                required: false,
              },
            ],
          },
        ],
      });

      let wins = 0;
      let totalScore = 0;

      matches.forEach((userResult) => {
        const opponentResult = userResult.match?.results?.[0];
        if (
          opponentResult &&
          userResult.point_earned > opponentResult.point_earned
        ) {
          wins++;
        }
        totalScore += userResult.point_earned;
      });

      const winRate =
        totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
      const averageScore =
        totalMatches > 0 ? Math.round(totalScore / totalMatches) : 0;

      const latestMatch = await MatchResult.findOne({
        where: { user_id: userId },
        order: [["match_result_id", "DESC"]],
        attributes: ["point_earned"],
      });

      const weeklyRank =
        (await MatchResult.count({
          where: {
            point_earned: {
              [Op.gt]: latestMatch?.point_earned || 0,
            },
          },
          distinct: true,
          col: "user_id",
        })) + 1;

      res.json({
        success: true,
        message: "Dashboard data retrieved successfully",
        data: {
          stats: {
            winRate,
            latestScore: latestMatch?.point_earned || 0,
            weeklyRank,
            averageScore,
            totalMatches,
            wins,
            losses: totalMatches - wins,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get dashboard data",
        error: error.message,
      });
    }
  }

  static async getTopics(req, res) {
    try {
      const { category_id, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (category_id) {
        whereClause.adu_swara_category_id = category_id;
      }

      const { count, rows: topics } = await AduSwaraTopic.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: AduSwaraCategory,
            as: "category",
            attributes: ["adu_swara_category_id", "adu_swara_category"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      res.json({
        success: true,
        message: "Topics retrieved successfully",
        data: {
          topics,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get topics",
        error: error.message,
      });
    }
  }

  static async getCategories(req, res) {
    try {
      const categories = await AduSwaraCategory.findAll({
        attributes: ["adu_swara_category_id", "adu_swara_category"],
        order: [["adu_swara_category", "ASC"]],
      });

      res.json({
        success: true,
        message: "Categories retrieved successfully",
        data: categories,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get categories",
        error: error.message,
      });
    }
  }

  static async createMatch(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id
      const allTopics = await AduSwaraTopic.findAll();

      if (allTopics.length === 0) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "No topics available",
        });
      }

      const randomTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
      const adu_swara_topic_id = randomTopic.adu_swara_topic_id;

      const match = await Match.findOne({
        include: [
          {
            model: MatchResult,
            as: "results",
          },
        ],
        where: Sequelize.where(
          Sequelize.fn("COUNT", Sequelize.col("results.id")),
          "<=",
          1
        ),
        group: ["Match.id"],
        transaction,
      });

      let isReady = true

      if (!match) {
        isReady = false
        const room = await axios.post(
          "https://api.daily.co/v1/rooms",
          {
            privacy: "public",
            properties: {
              enable_screenshare: true,
              enable_chat: true,
              max_participants: 2,
            },
          },
          {
            headers: { Authorization: `Bearer ${DAILY_KEY}` },
          }
        );
        match = await Match.create(
          {
            adu_swara_topic_id,
            created_at: new Date(),
            meeting_url: room.data.url
          },
          { transaction }
        );
      }

      await transaction.commit();

      res.json({
        success: true,
        message: isReady
          ? "Match ready! Battle can start"
          : "Waiting for opponent...",
        data: {
          match: match,
          isReady,
          countdown: 30,
        },
      });

    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to create match",
        error: error.message,
      });
    }
  }

  // static async createMatch(req, res) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     const { adu_swara_topic_id } = req.body;
  //     const userId = req.user.user_id;

  //     const topic = await AduSwaraTopic.findByPk(adu_swara_topic_id);
  //     if (!topic) {
  //       await transaction.rollback();
  //       return res.status(404).json({
  //         success: false,
  //         message: "Topic not found",
  //       });
  //     }

  //     const userActiveMatch = await MatchResult.findOne({
  //       where: { user_id: userId },
  //       include: [
  //         {
  //           model: Match,
  //           as: "match",
  //           where: { adu_swara_topic_id },
  //           required: true,
  //           include: [
  //             {
  //               model: MatchResult,
  //               as: "results",
  //             },
  //           ],
  //         },
  //       ],
  //       transaction,
  //     });

  //     if (userActiveMatch && userActiveMatch.match.results.length < 2) {
  //       await transaction.rollback();
  //       return res.status(400).json({
  //         success: false,
  //         message: "You already have an active match with this topic",
  //       });
  //     }

  //     const allMatches = await Match.findAll({
  //       where: { adu_swara_topic_id },
  //       include: [
  //         {
  //           model: MatchResult,
  //           as: "results",
  //         },
  //       ],
  //       transaction,
  //     });

  //     let match = allMatches.find((m) => {
  //       return m.results.length === 1 && m.results[0].user_id !== userId;
  //     });

  //     if (!match) {
  //       match = await Match.create(
  //         {
  //           adu_swara_topic_id,
  //           created_at: new Date(),
  //         },
  //         { transaction }
  //       );
  //     }

  //     const matchResult = await MatchResult.create(
  //       {
  //         match_id: match.match_id,
  //         user_id: userId,
  //         point_earned: 0,
  //         kelancaran_point: 0,
  //         penggunaan_bahasa_point: 0,
  //         ekspresi_point: 0,
  //         struktur_kalimat_point: 0,
  //         isi_point: 0,
  //         kelancaran_suggest: "",
  //         penggunaan_bahasa_suggest: "",
  //         ekspresi_suggest: "",
  //         struktur_kalimat_suggest: "",
  //         isi_suggest: "",
  //       },
  //       { transaction }
  //     );

  //     await transaction.commit();

  //     const fullMatch = await Match.findByPk(match.match_id, {
  //       include: [
  //         {
  //           model: AduSwaraTopic,
  //           as: "topic",
  //           include: [
  //             {
  //               model: AduSwaraCategory,
  //               as: "category",
  //             },
  //           ],
  //         },
  //         {
  //           model: MatchResult,
  //           as: "results",
  //           include: [
  //             {
  //               model: User,
  //               as: "user",
  //               attributes: ["user_id", "full_name", "email"],
  //             },
  //           ],
  //         },
  //       ],
  //     });

  //     const isReady = fullMatch.results.length === 2;

  //     res.json({
  //       success: true,
  //       message: isReady
  //         ? "Match ready! Battle can start"
  //         : "Waiting for opponent...",
  //       data: {
  //         match: fullMatch,
  //         isReady,
  //         countdown: 30,
  //       },
  //     });
  //   } catch (error) {
  //     await transaction.rollback();
  //     res.status(500).json({
  //       success: false,
  //       message: "Failed to create match",
  //       error: error.message,
  //     });
  //   }
  // }

  static async getMatchDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const match = await Match.findByPk(id, {
        include: [
          {
            model: AduSwaraTopic,
            as: "topic",
            include: [
              {
                model: AduSwaraCategory,
                as: "category",
              }
            ],
          },
          {
            model: MatchResult,
            as: "results",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["user_id", "full_name", "email"],
              },
            ],
          },
        ],
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
        });
      }

      const isParticipant = match.results.some((r) => r.user_id === userId);
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: "You are not a participant in this match",
        });
      }

      res.json({
        success: true,
        message: "Match detail retrieved successfully",
        data: match,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get match detail",
        error: error.message,
      });
    }
  }

  static async submitMatchResult(req, res) {
    const transaction = await sequelize.transaction();
    let extracted = null;
    let tempVideoPath = null;
    let tempAudioPath = null;

    try {
      const { id: matchId } = req.params;
      const userId = req.user.user_id;
      let level = 1;

      const match = await Match.findByPk(matchId, {
        include: [
          {
            model: AduSwaraTopic,
            as: "topic",
            attributes: ["adu_swara_topic_id", "title", "keywords", "created_at", "image"],
          },
        ]
      });

      if (!match) {
        return res.status(404).json({
          success: false,
          message: "Match not found",
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
      console.log("📤 Video uploaded:", videoUrl);

      const user = await User.findByPk(userId, {
        include: [
          {
            model: Mentee,
            as: 'mentee',
            attributes: ['mentee_id', 'point', 'exercise_count', 'minute_count', 'token_count', 'last_token_reset']
          }
        ]
      });

      const point = user.mentee[0]?.point || 0;

      if (point <= 200) level = 1;
      else if (point <= 500) level = 2;
      else if (point <= 900) level = 3;
      else if (point <= 1800) level = 4;
      else if (point <= 6500) level = 5;

      console.log("level latihan:", level);

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

      const analyzeAudio = async () => {
        console.log("🎵 Starting audio analysis...");
        const audioData = new FormData();
        audioData.append("audio", fs.createReadStream(tempAudioPath), {
          filename: "extracted_audio.wav",
          contentType: "audio/wav",
        });

        audioData.append("custom_topic", match.topic.title);
        audioData.append("custom_keywords", match.topic.keywords);

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

      const [videoResult, audioResult] = await Promise.all([
        analyzeVideo(),
        analyzeAudio()
      ]);

      console.log("✅ Both analyses completed successfully");

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

        tempo = audioResult.result.tempo.score;
        artikulasi = audioResult.result.articulation.score;

        jeda = audioResult.result.tempo.has_long_pause ? 0 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : 0;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 1 : 0;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 1 : 0;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -0.25 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else if (level === 2) {

        tempo = audioResult.result.tempo.score;
        artikulasi = audioResult.result.articulation.score;
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

        tempo = audioResult.result.tempo.score;
        artikulasi = audioResult.result.articulation.score;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords.score;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -2;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 2 : -1;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else if (level === 4) {

        tempo = audioResult.result.tempo.score;
        artikulasi = audioResult.result.articulation.score;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords.score;

        jeda = audioResult.result.tempo.has_long_pause ? -2 : 1;
        first_impression = videoResult.result.analysis_results.facial_expression.first_impression.expression === 'Happy' ? 1 : -3;
        ekspresi = videoResult.result.analysis_results.facial_expression.dominant_expression === 'Happy' ? 2 : -2;
        gestur = videoResult.result.analysis_results.gesture.score >= 7 &&
          !videoResult.result.analysis_results.gesture.details.nervous_gestures_detected
          ? 0 : -2;
        kata_pengisi = audioResult.result.articulation.filler_count > 0 ? -1.5 : 1;
        kata_tidak_senonoh = audioResult.result.profanity.has_profanity ? -5 : 0;

      } else {

        tempo = audioResult.result.tempo.score;
        artikulasi = audioResult.result.articulation.score;
        kontak_mata = videoResult.result.analysis_results.eye_contact.summary.gaze_away_time >= 0 &&
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 5 ? 5 :
          videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 5 &&
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 8 ? 4 :
            videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 8 &&
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 10 ? 3 :
              videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 10 &&
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time <= 12 ? 2 :
                videoResult.result.analysis_results.eye_contact.summary.gaze_away_time > 12 ? 1 : 0;
        kesesuaian_topik = audioResult.result.keywords.score;
        struktur = audioResult.result.structure.score;

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

      const result = await MatchResult.create({
        match_id: matchId,
        user_id: userId,
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
      });

      res.status(200).json({
        success: true,
        message: "Match result submitted successfully",
        data: result,
      });

    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to submit match result",
        error: error.message,
      });
    }
  }

  // static async submitMatchResult(req, res) {
  //   const transaction = await sequelize.transaction();

  //   try {
  //     const { id: matchId } = req.params;
  //     const userId = req.user.user_id;
  //     const {
  //       kelancaran_point,
  //       penggunaan_bahasa_point,
  //       ekspresi_point,
  //       struktur_kalimat_point,
  //       isi_point,
  //       kelancaran_suggest,
  //       penggunaan_bahasa_suggest,
  //       ekspresi_suggest,
  //       struktur_kalimat_suggest,
  //       isi_suggest,
  //     } = req.body;

  //     const point_earned =
  //       kelancaran_point +
  //       penggunaan_bahasa_point +
  //       ekspresi_point +
  //       struktur_kalimat_point +
  //       isi_point;

  //     const matchResult = await MatchResult.findOne({
  //       where: {
  //         match_id: matchId,
  //         user_id: userId,
  //       },
  //       transaction,
  //     });

  //     if (!matchResult) {
  //       await transaction.rollback();
  //       return res.status(404).json({
  //         success: false,
  //         message: "Match result not found",
  //       });
  //     }

  //     await matchResult.update(
  //       {
  //         point_earned,
  //         kelancaran_point,
  //         penggunaan_bahasa_point,
  //         ekspresi_point,
  //         struktur_kalimat_point,
  //         isi_point,
  //         kelancaran_suggest,
  //         penggunaan_bahasa_suggest,
  //         ekspresi_suggest,
  //         struktur_kalimat_suggest,
  //         isi_suggest,
  //       },
  //       { transaction }
  //     );

  //     await transaction.commit();

  //     const updatedMatch = await Match.findByPk(matchId, {
  //       include: [
  //         {
  //           model: MatchResult,
  //           as: "results",
  //           include: [
  //             {
  //               model: User,
  //               as: "user",
  //               attributes: ["user_id", "full_name", "email"],
  //             },
  //           ],
  //         },
  //       ],
  //     });

  //     let winner = null;
  //     let isMatchComplete = false;

  //     if (
  //       updatedMatch.results.length === 2 &&
  //       updatedMatch.results.every((r) => r.point_earned > 0)
  //     ) {
  //       isMatchComplete = true;
  //       const sorted = updatedMatch.results.sort(
  //         (a, b) => b.point_earned - a.point_earned
  //       );
  //       winner = sorted[0];
  //     }

  //     res.json({
  //       success: true,
  //       message: "Match result submitted successfully",
  //       data: {
  //         match_id: updatedMatch.match_id,
  //         is_match_complete: isMatchComplete,
  //         results: updatedMatch.results.map((r) => ({
  //           user_id: r.user_id,
  //           full_name: r.user.full_name,
  //           point_earned: r.point_earned,
  //           kelancaran_point: r.kelancaran_point,
  //           penggunaan_bahasa_point: r.penggunaan_bahasa_point,
  //           ekspresi_point: r.ekspresi_point,
  //           struktur_kalimat_point: r.struktur_kalimat_point,
  //           isi_point: r.isi_point,
  //           kelancaran_suggest: r.kelancaran_suggest,
  //           penggunaan_bahasa_suggest: r.penggunaan_bahasa_suggest,
  //           ekspresi_suggest: r.ekspresi_suggest,
  //           struktur_kalimat_suggest: r.struktur_kalimat_suggest,
  //           isi_suggest: r.isi_suggest,
  //           is_you: r.user_id === userId,
  //         })),
  //         winner: winner
  //           ? {
  //             user_id: winner.user_id,
  //             full_name: winner.user.full_name,
  //             point_earned: winner.point_earned,
  //           }
  //           : null,
  //       },
  //     });
  //   } catch (error) {
  //     await transaction.rollback();
  //     res.status(500).json({
  //       success: false,
  //       message: "Failed to submit match result",
  //       error: error.message,
  //     });
  //   }
  // }

  static async getMatchHistory(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.user_id;

      const { count, rows: results } = await MatchResult.findAndCountAll({
        where: { user_id: userId },
        include: [
          {
            model: Match,
            as: "match",
            include: [
              {
                model: AduSwaraTopic,
                as: "topic",
                include: [
                  {
                    model: AduSwaraCategory,
                    as: "category",
                  },
                ],
              },
              {
                model: MatchResult,
                as: "results",
                include: [
                  {
                    model: User,
                    as: "user",
                    attributes: ["user_id", "full_name"],
                  },
                ],
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["match_result_id", "DESC"]],
        distinct: true,
      });

      const history = results.map((result) => {
        const opponentResult = result.match.results.find(
          (r) => r.user_id !== userId
        );
        const isWin = opponentResult
          ? result.point_earned > opponentResult.point_earned
          : false;
        const isDraw = opponentResult
          ? result.point_earned === opponentResult.point_earned
          : false;

        return {
          ...result.toJSON(),
          status: isDraw ? "DRAW" : isWin ? "WIN" : "LOSE",
          opponent: opponentResult
            ? {
              user_id: opponentResult.user.user_id,
              full_name: opponentResult.user.full_name,
              point_earned: opponentResult.point_earned,
            }
            : null,
        };
      });

      res.json({
        success: true,
        message: "Match history retrieved successfully",
        data: {
          history,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get match history",
        error: error.message,
      });
    }
  }

  static async getLeaderboard(req, res) {
    try {
      const { period = "all", page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      let dateFilter = {};
      if (period === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter.created_at = { [Op.gte]: weekAgo };
      } else if (period === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter.created_at = { [Op.gte]: monthAgo };
      }

      const leaderboard = await MatchResult.findAll({
        attributes: [
          "user_id",
          [
            sequelize.fn("COUNT", sequelize.col("match_result_id")),
            "total_matches",
          ],
          [sequelize.fn("SUM", sequelize.col("point_earned")), "total_points"],
          [
            sequelize.fn("AVG", sequelize.col("point_earned")),
            "average_points",
          ],
        ],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["user_id", "full_name", "email"],
          },
        ],
        where: dateFilter,
        group: ["user_id"],
        order: [[sequelize.literal("total_points"), "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        subQuery: false,
      });

      res.json({
        success: true,
        message: "Leaderboard retrieved successfully",
        data: {
          leaderboard,
          period,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get leaderboard",
        error: error.message,
      });
    }
  }

  static async createAduSwaraTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { title, adu_swara_category_id, keywords } = req.body;

      if (!title || !adu_swara_category_id || !keywords) {
        return res.status(400).json({
          success: false,
          message: "Title, category, and keywords are required"
        });
      }

      // create topic
      const topic = await AduSwaraTopic.create(
        {
          title,
          adu_swara_category_id,
          keywords,
          image: req.file ? req.file.path : null
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: "Topic created successfully",
        data: topic
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to create topic",
        error: error.message
      });
    }
  }

  static async deleteAduSwaraTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const topic = await AduSwaraTopic.findByPk(id, { transaction });

      if (!topic) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Topic not found"
        });
      }

      await topic.destroy({ transaction });
      await transaction.commit();

      return res.json({
        success: true,
        message: "Topic deleted successfully"
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to delete topic",
        error: error.message
      });
    }
  }

  static async updateAduSwaraTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { title, adu_swara_category_id, keywords } = req.body;

      const topic = await AduSwaraTopic.findByPk(id, { transaction });

      if (!topic) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Topic not found"
        });
      }

      await topic.update(
        {
          title: title || topic.title,
          adu_swara_category_id: adu_swara_category_id || topic.adu_swara_category_id,
          keywords: keywords || topic.keywords,
          image: req.file ? req.file.path : topic.image
        },
        { transaction }
      );

      await transaction.commit();

      return res.json({
        success: true,
        message: "Topic updated successfully",
        data: topic
      });

    } catch (error) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: "Failed to update topic",
        error: error.message
      });
    }
  }

}

module.exports = AduSwaraController;
