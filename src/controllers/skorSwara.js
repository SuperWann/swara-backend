const { SkorSwaraTopic, SkorSwara, SkorSwaraMode, SkorSwaraImage, User, Mentee, sequelize } = require("../models");
const aiService = require("../services/aiService");
const chatgptService = require("../services/chatgptService");
const AudioExtractor = require('../utils/audioExtractor');
const path = require("path");
const axios = require('axios');
const FormData = require("form-data");
const fs = require("fs");
const cloudinary = require('cloudinary').v2;

class SkorSwaraController {
  static async getAllModes(req, res) {
    try {
      const modes = await SkorSwaraMode.findAll({
        where: { is_active: true },
        attributes: ['mode_id', 'mode_name', 'mode_type', 'description', 'icon'],
        order: [['mode_id', 'ASC']],
      });

      res.json({
        success: true,
        message: "Modes retrieved successfully",
        data: modes,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get modes",
        error: error.message,
      });
    }
  }

  static async getModeDetail(req, res) {
    try {
      const { id } = req.params;

      const mode = await SkorSwaraMode.findOne({
        where: {
          mode_id: id,
          is_active: true
        },
        attributes: ['mode_id', 'mode_name', 'mode_type', 'description', 'icon'],
      });

      if (!mode) {
        return res.status(404).json({
          success: false,
          message: "Mode not found",
        });
      }

      res.json({
        success: true,
        message: "Mode detail retrieved successfully",
        data: mode,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get mode detail",
        error: error.message,
      });
    }
  }

  static async startLatihan(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { mode_id, skor_swara_topic_id, custom_topic } = req.body;

      const mode = await SkorSwaraMode.findOne({
        where: {
          mode_id,
          is_active: true
        },
        transaction,
      });

      if (!mode) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Mode not found or inactive",
        });
      }

      let topicData = null;
      let customKeyword = null;
      let imageUrl = null;

      if (mode.mode_type === 'text') {
        if (skor_swara_topic_id) {
          topicData = await SkorSwaraTopic.findByPk(skor_swara_topic_id, { transaction });
          if (!topicData) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: "Selected topic not found",
            });
          }
        } else {
          const topics = await SkorSwaraTopic.findAll({ transaction });
          if (topics.length === 0) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: "No topics available for practice",
            });
          }
          topicData = topics[Math.floor(Math.random() * topics.length)];
        }
      } else if (mode.mode_type === 'image') {
        const allImages = await SkorSwaraImage.findAll({
          where: { is_active: true },
          include: [
            {
              model: SkorSwaraTopic,
              as: "topic",
              attributes: ["skor_swara_topic_id", "topic", "text"],
            },
          ],
          transaction,
        });

        if (allImages.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "No images available for image mode. Please add images first.",
          });
        }

        const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
        imageUrl = randomImage.image_url;

        topicData = {
          skor_swara_topic_id: randomImage.topic.skor_swara_topic_id,
          topic: randomImage.topic.topic,
          text: randomImage.topic.text,
          image_id: randomImage.image_id,
          image_description: randomImage.image_description,
        };
      } else if (mode.mode_type === 'custom') {
        if (custom_topic) {
          try {
            customKeyword = await chatgptService.generateKeywords(custom_topic);

            if (!chatgptService.validateKeywords(customKeyword)) {
              throw new Error("Generated keywords are invalid");
            }
          } catch (aiError) {
            await transaction.rollback();
            return res.status(500).json({
              success: false,
              message: "Failed to generate keywords from custom topic",
              error: aiError.message,
            });
          }

          topicData = {
            topic: custom_topic,
            text: `Sampaikan presentasi Anda tentang: ${custom_topic}`,
          };
        } else if (skor_swara_topic_id) {
          topicData = await SkorSwaraTopic.findByPk(skor_swara_topic_id, { transaction });
          if (!topicData) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: "Selected topic not found",
            });
          }

          try {
            customKeyword = await chatgptService.generateKeywords(topicData.topic);
          } catch (aiError) {
            console.warn("Warning: Could not generate keywords for existing topic:", aiError.message);
          }
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Custom mode requires either custom_topic or skor_swara_topic_id",
          });
        }
      }

      const skorSwara = await SkorSwara.create(
        {
          user_id: userId,
          mode_id: mode.mode_id,
          skor_swara_topic_id: (mode.mode_type === 'text' && topicData) ? topicData.skor_swara_topic_id :
            (mode.mode_type === 'image' && topicData) ? topicData.skor_swara_topic_id : null,
          custom_topic: custom_topic || null,
          custom_keyword: customKeyword || null,
          image_id: (mode.mode_type === 'image' && topicData) ? topicData.image_id : null,
          point_earned: 0,
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
          skor_total: 0,
        },
        { transaction }
      );

      await transaction.commit();

      const responseData = {
        skor_swara_id: skorSwara.skor_swara_id,
        mode: {
          mode_id: mode.mode_id,
          mode_name: mode.mode_name,
          mode_type: mode.mode_type,
        },
        topic: {
          topic: topicData.topic,
          text: topicData.text,
        },
      };

      if (mode.mode_type === 'text' && topicData.skor_swara_topic_id) {
        responseData.topic.skor_swara_topic_id = topicData.skor_swara_topic_id;
      }

      if (mode.mode_type === 'image') {
        responseData.topic.skor_swara_topic_id = topicData.skor_swara_topic_id;
        responseData.image = {
          image_id: topicData.image_id,
          image_url: imageUrl,
          image_description: topicData.image_description,
        };
      }

      if (mode.mode_type === 'custom' && customKeyword) {
        responseData.keywords = customKeyword;
      }

      res.json({
        success: true,
        message: "Latihan started successfully",
        data: responseData,
      });
    } catch (error) {
      // Only rollback if transaction is still pending
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      res.status(500).json({
        success: false,
        message: "Failed to start latihan",
        error: error.message,
      });
    }
  }

  static async uploadAndAnalyze(req, res) {
    let videoPath = null;
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { skor_swara_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      videoPath = req.file.path;

      if (!skor_swara_id) {
        await fs.unlink(videoPath);
        return res.status(400).json({
          success: false,
        });
      }

      const skorSwara = await SkorSwara.findOne({
        where: {
          skor_swara_id,
          user_id: userId,
        },
        include: [
          {
            model: SkorSwaraTopic,
            as: "skor_swara_topic",
            attributes: ["skor_swara_topic_id", "topic", "text"],
            required: false,
          },
          {
            model: SkorSwaraMode,
            as: "mode",
            attributes: ["mode_id", "mode_name", "mode_type"],
          },
          {
            model: SkorSwaraImage,
            as: "image",
            attributes: ["image_id", "image_url", "image_description"],
            required: false,
          },
        ],
        transaction,
      });

      if (!skorSwara) {
        await fs.unlink(videoPath);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Skor Swara session not found",
        });
      }

      if (skorSwara.point_earned > 0) {
        await fs.unlink(videoPath);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "This session has already been submitted",
        });
      }

      let topicInfo = {};

      if (skorSwara.mode.mode_type === 'text' && skorSwara.skor_swara_topic) {
        topicInfo = {
          topic: skorSwara.skor_swara_topic.topic,
          text: skorSwara.skor_swara_topic.text,
        };
      } else if (skorSwara.mode.mode_type === 'image') {
        topicInfo = {
          topic: skorSwara.skor_swara_topic?.topic || "Deskripsi Gambar",
          text: skorSwara.skor_swara_topic?.text || "Deskripsikan gambar yang Anda lihat dengan detail",
          image_url: skorSwara.image?.image_url,
          image_description: skorSwara.image?.image_description,
        };
      } else if (skorSwara.mode.mode_type === 'custom') {
        topicInfo = {
          topic: skorSwara.custom_topic || skorSwara.skor_swara_topic?.topic || "Custom Topic",
          text: skorSwara.custom_topic ? `Presentasi tentang: ${skorSwara.custom_topic}` : skorSwara.skor_swara_topic?.text || "",
          keywords: skorSwara.custom_keyword,
        };
      }

      const aiResult = await aiService.analyzeVideo(videoPath, skor_swara_id, topicInfo);

      if (!aiService.validateResponse(aiResult)) {
        await fs.unlink(videoPath);
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: "Invalid response from AI service",
        });
      }

      const totalPoints = aiResult.skor_total || 0;

      await skorSwara.update(
        {
          point_earned: totalPoints,
          tempo: aiResult.tempo || 0,
          artikulasi: aiResult.artikulasi || 0,
          kontak_mata: aiResult.kontak_mata || 0,
          kesesuaian_topik: aiResult.kesesuaian_topik || 0,
          struktur: aiResult.struktur || 0,
          jeda: aiResult.jeda || 0,
          first_impression: aiResult.first_impression || 0,
          ekspresi: aiResult.ekspresi || 0,
          gestur: aiResult.gestur || 0,
          kata_pengisi: aiResult.kata_pengisi || 0,
          kata_tidak_senonoh: aiResult.kata_tidak_senonoh || 0,
          skor_total: totalPoints,
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Video analyzed successfully",
        data: {
          skor_swara_id: skorSwara.skor_swara_id,
          topic: skorSwara.skor_swara_topic,
          scores: {
            tempo: aiResult.tempo,
            artikulasi: aiResult.artikulasi,
            kontak_mata: aiResult.kontak_mata,
            kesesuaian_topik: aiResult.kesesuaian_topik,
            struktur: aiResult.struktur,
            jeda: aiResult.jeda,
            first_impression: aiResult.first_impression,
            ekspresi: aiResult.ekspresi,
            gestur: aiResult.gestur,
            kata_pengisi: aiResult.kata_pengisi,
            kata_tidak_senonoh: aiResult.kata_tidak_senonoh,
            skor_total: totalPoints,
          },
        },
      });
    } catch (error) {
      await transaction.rollback();

      if (videoPath) {
        try {
          await fs.unlink(videoPath);
        } catch (unlinkError) {
          console.error("Failed to delete video file:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to analyze video",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async submitHasil(req, res) {
    let extracted = null;

    try {
      const userId = req.user.user_id;
      const { skor_swara_topic_id } = req.body;
      let level = 1;

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

      // 2️⃣ Ambil user + mentee
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

      if (point <= 100) level = 1;
      else if (point <= 200) level = 2;
      else level = 3;

      // 3️⃣ Ambil topik
      const topicData = await SkorSwaraTopic.findByPk(skor_swara_topic_id);
      if (!topicData) {
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      const textTopic = topicData.text;

      // 4️⃣ Extract audio
      extracted = await AudioExtractor.extractFromCloudinary(videoUrl);

      // 5️⃣ Download video untuk dikirim ke API eksternal
      const videoResponse = await axios.get(videoUrl, { responseType: "stream" });

      const videoData = new FormData();
      videoData.append("video", videoResponse.data, {
        filename: "video.mp4",
        contentType: "video/mp4",
      });
      videoData.append("level", level);
      videoData.append("user_id", userId);

      const uploadVideoResponse = await axios.post(
        "https://cyberlace-swara-api.hf.space/api/v1/analyze",
        videoData,
        {
          headers: { ...videoData.getHeaders() },
        }
      );

      const { task_id } = uploadVideoResponse.data;

      // 🔁 POLLING RESULT VIDEO
      const checkResult = async (taskId, maxAttempts = 100, delayMs = 2000) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const response = await axios.get(
            `https://cyberlace-swara-api.hf.space/api/v1/task/${taskId}`
          );

          if (response.data.result !== null) return response.data;

          if (response.data.status === "failed") {
            throw new Error(`Analysis failed: ${response.data.error}`);
          }

          await new Promise((r) => setTimeout(r, delayMs));
        }

        throw new Error("Timeout waiting for result");
      };

      const videoResult = await checkResult(task_id);

      // 6️⃣ Kirim audio ke API kedua
      const audioData = new FormData();
      audioData.append("audio", fs.createReadStream(extracted.audioPath), {
        filename: "extracted_audio.wav",
        contentType: "audio/wav",
      });
      audioData.append("reference_text", textTopic);

      const uploadAudioResponse = await axios.post(
        "https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/analyze",
        audioData,
        {
          headers: { ...audioData.getHeaders() },
        }
      );

      const audio = uploadAudioResponse.data;

      const checkAudioResult = async (taskId, maxAttempts = 30, delayMs = 2000) => {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const response = await axios.get(
            `https://cyberlace-api-swara-audio-analysis.hf.space/api/v1/status/${taskId}`
          );

          if (response.data.result !== null) return response.data;

          if (response.data.status === "failed") {
            throw new Error(`Audio analysis failed: ${response.data.error}`);
          }

          await new Promise((r) => setTimeout(r, delayMs));
        }

        throw new Error("Timeout waiting for audio result");
      };

      const audioResult = await checkAudioResult(audio.task_id);

      res.json({
        success: true,
        message: "Video and audio processed",
        data: { videoResult, audioResult, level, videoUrl }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Failed to analyze video and audio",
        error: error.message,
      });
    }
  }


  static async getRiwayat(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows: riwayatList } = await SkorSwara.findAndCountAll({
        where: {
          user_id: userId,
          point_earned: { [sequelize.Sequelize.Op.gt]: 0 },
        },
        include: [
          {
            model: SkorSwaraTopic,
            as: "skor_swara_topic",
            attributes: ["skor_swara_topic_id", "topic"],
            required: false,
          },
          {
            model: SkorSwaraMode,
            as: "mode",
            attributes: ["mode_id", "mode_name", "mode_type"],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["skor_swara_id", "DESC"]],
        distinct: true,
      });

      let stats = {
        total_latihan: count,
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
        },
        total_points: 0,
      };

      if (count > 0) {
        const allScores = await SkorSwara.findAll({
          where: {
            user_id: userId,
            point_earned: { [sequelize.Sequelize.Op.gt]: 0 },
          },
          attributes: [
            [sequelize.fn("AVG", sequelize.col("tempo")), "avg_tempo"],
            [sequelize.fn("AVG", sequelize.col("artikulasi")), "avg_artikulasi"],
            [sequelize.fn("AVG", sequelize.col("kontak_mata")), "avg_kontak_mata"],
            [sequelize.fn("AVG", sequelize.col("kesesuaian_topik")), "avg_kesesuaian_topik"],
            [sequelize.fn("AVG", sequelize.col("struktur")), "avg_struktur"],
            [sequelize.fn("AVG", sequelize.col("jeda")), "avg_jeda"],
            [sequelize.fn("AVG", sequelize.col("first_impression")), "avg_first_impression"],
            [sequelize.fn("AVG", sequelize.col("ekspresi")), "avg_ekspresi"],
            [sequelize.fn("AVG", sequelize.col("gestur")), "avg_gestur"],
            [sequelize.fn("AVG", sequelize.col("kata_pengisi")), "avg_kata_pengisi"],
            [sequelize.fn("AVG", sequelize.col("kata_tidak_senonoh")), "avg_kata_tidak_senonoh"],
            [sequelize.fn("AVG", sequelize.col("skor_total")), "avg_overall"],
            [sequelize.fn("SUM", sequelize.col("point_earned")), "total_points"],
          ],
          raw: true,
        });

        if (allScores[0]) {
          stats.average_scores = {
            tempo: parseFloat(allScores[0].avg_tempo || 0).toFixed(2),
            artikulasi: parseFloat(allScores[0].avg_artikulasi || 0).toFixed(2),
            kontak_mata: parseFloat(allScores[0].avg_kontak_mata || 0).toFixed(2),
            kesesuaian_topik: parseFloat(allScores[0].avg_kesesuaian_topik || 0).toFixed(2),
            struktur: parseFloat(allScores[0].avg_struktur || 0).toFixed(2),
            jeda: parseFloat(allScores[0].avg_jeda || 0).toFixed(2),
            first_impression: parseFloat(allScores[0].avg_first_impression || 0).toFixed(2),
            ekspresi: parseFloat(allScores[0].avg_ekspresi || 0).toFixed(2),
            gestur: parseFloat(allScores[0].avg_gestur || 0).toFixed(2),
            kata_pengisi: parseFloat(allScores[0].avg_kata_pengisi || 0).toFixed(2),
            kata_tidak_senonoh: parseFloat(allScores[0].avg_kata_tidak_senonoh || 0).toFixed(2),
            overall: parseFloat(allScores[0].avg_overall || 0).toFixed(2),
          };
          stats.total_points = parseInt(allScores[0].total_points || 0);
        }
      }

      res.json({
        success: true,
        message: "Riwayat latihan retrieved successfully",
        data: {
          statistics: stats,
          riwayat: riwayatList,
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
        message: "Failed to get riwayat latihan",
        error: error.message,
      });
    }
  }

  static async getDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const skorSwara = await SkorSwara.findOne({
        where: {
          skor_swara_id: id,
          user_id: userId,
        },
        include: [
          {
            model: SkorSwaraTopic,
            as: "skor_swara_topic",
            attributes: ["skor_swara_topic_id", "topic", "text"],
            required: false,
          },
          {
            model: SkorSwaraMode,
            as: "mode",
            attributes: ["mode_id", "mode_name", "mode_type"],
          },
          {
            model: SkorSwaraImage,
            as: "image",
            attributes: ["image_id", "image_url", "image_description"],
            required: false,
          },
        ],
      });

      if (!skorSwara) {
        return res.status(404).json({
          success: false,
          message: "Latihan not found",
        });
      }

      const responseData = {
        skor_swara_id: skorSwara.skor_swara_id,
        mode: skorSwara.mode,
        scores: {
          tempo: skorSwara.tempo,
          artikulasi: skorSwara.artikulasi,
          kontak_mata: skorSwara.kontak_mata,
          kesesuaian_topik: skorSwara.kesesuaian_topik,
          struktur: skorSwara.struktur,
          jeda: skorSwara.jeda,
          first_impression: skorSwara.first_impression,
          ekspresi: skorSwara.ekspresi,
          gestur: skorSwara.gestur,
          kata_pengisi: skorSwara.kata_pengisi,
          kata_tidak_senonoh: skorSwara.kata_tidak_senonoh,
          skor_total: skorSwara.skor_total,
          total_points: skorSwara.point_earned,
        },
      };

      // Add topic info based on mode
      if (skorSwara.mode.mode_type === 'text' && skorSwara.skor_swara_topic) {
        responseData.topic = skorSwara.skor_swara_topic;
      } else if (skorSwara.mode.mode_type === 'image') {
        responseData.topic = skorSwara.skor_swara_topic || {
          topic: "Deskripsi Gambar",
          text: "Deskripsikan gambar yang Anda lihat dengan detail",
        };
        if (skorSwara.image) {
          responseData.image = {
            image_id: skorSwara.image.image_id,
            image_url: skorSwara.image.image_url,
            image_description: skorSwara.image.image_description,
          };
        }
      } else if (skorSwara.mode.mode_type === 'custom') {
        responseData.topic = {
          topic: skorSwara.custom_topic || skorSwara.skor_swara_topic?.topic || "Custom Topic",
          text: skorSwara.custom_topic ? `Presentasi tentang: ${skorSwara.custom_topic}` : skorSwara.skor_swara_topic?.text || "",
        };
        if (skorSwara.custom_keyword) {
          responseData.keyword = skorSwara.custom_keyword;
        }
      }

      res.json({
        success: true,
        message: "Detail latihan retrieved successfully",
        data: responseData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get detail latihan",
        error: error.message,
      });
    }
  }

  static async getAllTopics(req, res) {
    try {
      const topics = await SkorSwaraTopic.findAll({
        attributes: ["skor_swara_topic_id", "topic", "text"],
        order: [["skor_swara_topic_id", "ASC"]],
      });

      const count = await SkorSwaraTopic.count();

      res.json({
        success: true,
        message: "Topics retrieved successfully",
        data: topics,
        total_topics: count,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get topics",
        error: error.message,
      });
    }
  }

  static async addTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { topic, text } = req.body;

      const existingTopic = await SkorSwaraTopic.findOne({
        where: { topic },
        transaction,
      });

      if (existingTopic) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Topic already exists",
        });
      }

      const newTopic = await SkorSwaraTopic.create(
        {
          topic: topic.trim(),
          text: text.trim(),
        },
        { transaction }
      );

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: "Topic added successfully",
        data: {
          skor_swara_topic_id: newTopic.skor_swara_topic_id,
          topic: newTopic.topic,
          text: newTopic.text,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to add topic",
        error: error.message,
      });
    }
  }

  static async deleteTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const topic = await SkorSwaraTopic.findByPk(id, { transaction });

      if (!topic) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      await topic.destroy({ transaction });

      await transaction.commit();

      res.json({
        success: true,
        message: "Topic deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to delete topic",
        error: error.message,
      });
    }
  }

  static async updateTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { topic, text } = req.body; // Use req.body.topic and req.body.text

      const topicToUpdate = await SkorSwaraTopic.findByPk(id, { transaction });

      if (!topicToUpdate) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Topic not found",
        });
      }

      await topicToUpdate.update(
        {
          topic: topic.trim(),
          text: text.trim(),
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Topic updated successfully",
        data: {
          skor_swara_topic_id: topicToUpdate.skor_swara_topic_id,
          topic: topicToUpdate.topic,
          text: topicToUpdate.text,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to update topic",
        error: error.message,
      });
    }
  }
}

module.exports = SkorSwaraController;
