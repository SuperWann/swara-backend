const { SkorSwaraTopic, SkorSwara, SkorSwaraMode, SkorSwaraImage, User, Mentee, sequelize } = require("../models");
const aiService = require("../services/aiService");
const chatgptService = require("../services/chatgptService");
const AudioExtractor = require('../utils/audioExtractor');
const path = require("path");
const axios = require('axios');
const FormData = require("form-data");
const fs = require("fs");
const { Op } = require("sequelize");
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

      // Validasi mode
      console.log('=== Fetching mode with mode_id:', mode_id);
      const mode = await SkorSwaraMode.findOne({
        where: {
          mode_id,
          is_active: true
        },
        transaction,
        logging: console.log, // LOG SQL QUERY
      });
      console.log('=== Mode found:', mode?.mode_type);

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
      let finalImageId = null;
      let finalTopicId = null;
      let finalCustomTopic = null;
      let finalCustomKeyword = null;

      // HANDLE MODE TYPE: TEXT
      if (mode.mode_type === 'text') {
        if (skor_swara_topic_id) {
          console.log('=== Fetching specific topic:', skor_swara_topic_id);
          topicData = await SkorSwaraTopic.findByPk(skor_swara_topic_id, {
            transaction,
            logging: console.log, // LOG SQL QUERY
          });
          console.log('=== Topic found:', topicData?.topic);
          if (!topicData) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: "Selected topic not found",
            });
          }
        } else {
          console.log('=== Fetching all topics for random selection');
          const topics = await SkorSwaraTopic.findAll({
            transaction,
            logging: console.log, // LOG SQL QUERY
          });
          console.log('=== Topics count:', topics.length);
          if (topics.length === 0) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: "No topics available for practice",
            });
          }
          topicData = topics[Math.floor(Math.random() * topics.length)];
        }

        finalTopicId = topicData.skor_swara_topic_id;
      }

      // HANDLE MODE TYPE: IMAGE
      else if (mode.mode_type === 'image') {
        console.log('=== Fetching all images');

        let level = 1;

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

        const allImages = await SkorSwaraImage.findAll({
          where: {
            is_active: true,
            level: {
              [Op.lte]: level
            }
          },
          transaction,
          logging: console.log, // LOG SQL QUERY
        });
        console.log('=== Images count:', allImages.length);

        if (allImages.length === 0) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: "No images available for image mode. Please add images first.",
          });
        }

        const randomImage = allImages[Math.floor(Math.random() * allImages.length)];
        imageUrl = randomImage.image_url;
        finalImageId = randomImage.image_id;

        topicData = {
          topic: randomImage.image_topic,
          text: `Sampaikan presentasi Anda tentang: ${randomImage.image_topic}`,
          keyword: randomImage.image_keyword,
          image_id: randomImage.image_id,
        };
      }

      // HANDLE MODE TYPE: CUSTOM
      else if (mode.mode_type === 'custom') {
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

          finalCustomTopic = custom_topic;
          finalCustomKeyword = customKeyword;

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
            finalCustomTopic = topicData.topic;
            finalCustomKeyword = customKeyword;
          } catch (aiError) {
            console.warn("Warning: Could not generate keywords for existing topic:", aiError.message);
            finalCustomTopic = topicData.topic;
            finalCustomKeyword = null;
          }
        } else {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Custom mode requires either custom_topic or skor_swara_topic_id",
          });
        }
      }

      // CREATE SKOR SWARA RECORD
      console.log('=== Creating SkorSwara record with:', {
        user_id: userId,
        mode_id: mode.mode_id,
        skor_swara_topic_id: finalTopicId,
        image_id: finalImageId,
        custom_topic: finalCustomTopic,
      });

      const skorSwara = await SkorSwara.create(
        {
          user_id: userId,
          mode_id: mode.mode_id,
          skor_swara_topic_id: finalTopicId,
          image_id: finalImageId,
          custom_topic: finalCustomTopic,
          custom_keyword: finalCustomKeyword,
          point_earned: 0,
          tempo: 0,
          artikulasi: 0,
          kontak_mata: 0,
          kesesuaian_topik: 0,
          Struktur: 0,
          jeda: 0,
          first_impression: 0,
          ekspresi: 0,
          gestur: 0,
          kata_pengisi: 0,
          kata_tidak_senonoh: 0,
        },
        {
          transaction,
          logging: console.log, // LOG SQL QUERY
        }
      );
      console.log('=== SkorSwara created with ID:', skorSwara.skor_swara_id);

      await transaction.commit();

      // BUILD RESPONSE
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

      // Tambahkan topic_id untuk mode text
      if (mode.mode_type === 'text') {
        responseData.topic.skor_swara_topic_id = topicData.skor_swara_topic_id;
      }

      // Tambahkan image data untuk mode image
      if (mode.mode_type === 'image') {
        responseData.image = {
          image_id: topicData.image_id,
          image_url: imageUrl,
          image_topic: topicData.topic,
          image_keyword: topicData.keyword,
        };
      }

      // Tambahkan keywords untuk mode custom
      if (mode.mode_type === 'custom' && finalCustomKeyword) {
        responseData.keywords = finalCustomKeyword;
      }

      res.json({
        success: true,
        message: "Latihan started successfully",
        status: skorSwara.status,
        data: responseData,
      });

    } catch (error) {
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

  static async submitHasil(req, res) {
    let extracted = null;
    let tempVideoPath = null;
    let tempAudioPath = null;

    try {
      const userId = req.user.user_id;
      const skor_swara_id = await SkorSwara.max('skor_swara_id', { where: { user_id: userId } });
      console.log('=== Submitting results for SkorSwara ID:', skor_swara_id);
      let level = 1;

      const skorSwara = await SkorSwara.findByPk(skor_swara_id);
      if (!skorSwara) {
        return res.status(404).json({
          success: false,
          message: "SkorSwara not found",
        });
      }

      const detailSkorSwara = await SkorSwara.findByPk(skor_swara_id, {
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
            attributes: ["image_id", "image_url", "image_keyword", "image_topic"],
            required: false,
          }],
      });

      const skorSwaraTopic = detailSkorSwara.skor_swara_topic;
      const skorSwaraMode = detailSkorSwara.mode;
      const skorSwaraImage = detailSkorSwara.image;

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

      const user = await Mentee.findOne({
        where: {
          user_id: userId
        }
      });

      console.log(user);

      const point = user.point;
      console.log("point latihan:", point);

      if (point <= 200) level = 1;
      else if (point > 200 && point <= 500) level = 2;
      else if (point > 500 && point <= 900) level = 3;
      else if (point > 900 && point <= 1800) level = 4;
      else if (point > 1800) level = 5;

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

        if (skorSwaraMode.mode_type === 'text') {
          audioData.append("custom_topic", skorSwaraTopic.topic || "");
          audioData.append("reference_text", skorSwaraTopic.text);
        } else if (skorSwaraMode.mode_type === 'image') {
          if (!skorSwaraImage) {
            throw new Error("Image data is required for image mode but not found");
          }
          const imageKeyword = skorSwaraImage.image_keyword
            ? skorSwaraImage.image_keyword.split(",").map(item => item.trim())
            : [];
          audioData.append("custom_topic", skorSwaraImage.image_topic || "");
          audioData.append("custom_keywords", JSON.stringify(imageKeyword));
        } else if (skorSwaraMode.mode_type === 'custom') {
          const customKeyword = detailSkorSwara.custom_keyword || "";
          const customKeywordList = customKeyword
            ? customKeyword.split(",").map(item => item.trim())
            : [];
          audioData.append("custom_topic", detailSkorSwara.custom_topic || "");
          audioData.append("custom_keywords", JSON.stringify(customKeywordList));
        }

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


      // Update data
      await SkorSwara.update(
        {
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
          status: "complete",
          video_result: videoUrl,
          result_ai: JSON.stringify(suggestions)
        },
        {
          where: { skor_swara_id: skor_swara_id }
        }
      );

      const updatedData = await SkorSwara.findByPk(skor_swara_id, {
        attributes: {
          exclude: ['result_ai']
        }
      });

      await Mentee.update({
        point: sequelize.literal(`point + ${pointEarned}`),
      }, {
        where: { mentee_id: updatedData.user_id },
      }
      );

      res.json({
        success: true,
        message: "Video and audio processed successfully",
        data: {
          updatedData: updatedData,
          suggestions: suggestions
        },
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Failed to analyze video and audio",
        error: error.message,
      });
    } finally {
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

  static async getRiwayat(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Ambil list riwayat
      const { count, rows: riwayatList } = await SkorSwara.findAndCountAll({
        where: {
          user_id: userId,
          point_earned: { [sequelize.Sequelize.Op.gt]: 0 },
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
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["skor_swara_id", "DESC"]],
        distinct: true,
      });

      // Default statistik
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
        },
        total_points: 0
      };

      // Hitung statistik jika ada data
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
            [sequelize.fn("SUM", sequelize.col("point_earned")), "total_points"],
          ],
          raw: true,
        });

        const s = allScores[0];

        stats.average_scores = {
          tempo: Number(s.avg_tempo || 0).toFixed(2),
          artikulasi: Number(s.avg_artikulasi || 0).toFixed(2),
          kontak_mata: Number(s.avg_kontak_mata || 0).toFixed(2),
          kesesuaian_topik: Number(s.avg_kesesuaian_topik || 0).toFixed(2),
          struktur: Number(s.avg_struktur || 0).toFixed(2),
          jeda: Number(s.avg_jeda || 0).toFixed(2),
          first_impression: Number(s.avg_first_impression || 0).toFixed(2),
          ekspresi: Number(s.avg_ekspresi || 0).toFixed(2),
          gestur: Number(s.avg_gestur || 0).toFixed(2),
          kata_pengisi: Number(s.avg_kata_pengisi || 0).toFixed(2),
          kata_tidak_senonoh: Number(s.avg_kata_tidak_senonoh || 0).toFixed(2),
        };

        stats.total_points = Number(s.total_points || 0);
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
            attributes: ["image_id", "image_url", "image_topic", "image_keyword"],
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
        if (skorSwara.image) {
          responseData.image = {
            image_id: skorSwara.image.image_id,
            image_url: skorSwara.image.image_url,
            image_topic: skorSwara.image.image_topic,
            image_keyword: skorSwara.image.image_keyword,
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

  static async getAllTopicsByLevel(req, res) {
    try {
      const userId = req.user.user_id;
      let level = 1;

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

      const topics = await SkorSwaraTopic.findAll({
        attributes: ["skor_swara_topic_id", "topic", "text"],
        order: [["skor_swara_topic_id", "ASC"]],
        where: {
          level: {
            [Op.lte]: level
          }
        }
      });

      res.json({
        success: true,
        message: "Topics retrieved successfully",
        data: topics,
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
      const { topic, text, level } = req.body;

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
          level: level,
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
          level: newTopic.level,
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
      const { topic, text, level } = req.body; // Use req.body.topic and req.body.text

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
          level: level,
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
          level: topicToUpdate.level,
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

  static async getAllImageTopics(req, res) {
    try {
      const imageTopics = await SkorSwaraImage.findAll({
        attributes: ["image_id", "image_topic", "image_keyword", "level", "image_url"],
        order: [["image_id", "ASC"]],
      });

      res.json({
        success: true,
        message: "Image topics retrieved successfully",
        data: imageTopics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get image topics",
        error: error.message,
      });
    }
  }

  static async createImageTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { image_keyword, image_topic, level } = req.body;

      // Validasi: pastikan file image ada
      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Image file is required",
        });
      }

      // Cloudinary sudah auto-upload via multer-storage-cloudinary
      // URL langsung tersedia di req.file.path
      const image_url = req.file.path; // Cloudinary secure_url

      // Simpan ke database
      const newImageTopic = await SkorSwaraImage.create(
        {
          image_url,
          image_keyword,
          image_topic,
          level,
        },
        { transaction }
      );

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: "Image topic added successfully",
        data: {
          image_id: newImageTopic.image_id,
          image_topic: newImageTopic.image_topic,
          image_keyword: newImageTopic.image_keyword,
          level: newImageTopic.level,
          image_url: newImageTopic.image_url,
          cloudinary_public_id: req.file.filename, // untuk delete image nanti
        },
      });
    } catch (error) {
      await transaction.rollback();

      // Jika ada error, hapus image dari Cloudinary
      if (req.file?.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: 'image'
          });
          console.log("❌ Deleted uploaded image from Cloudinary due to error");
        } catch (deleteError) {
          console.error("Failed to delete image from Cloudinary:", deleteError);
        }
      }

      console.error("Create Image Topic Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add image topic",
        error: error.message,
      });
    }
  }


  static async deleteImageTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;

      const imageTopic = await SkorSwaraImage.findByPk(id);

      if (!imageTopic) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Image topic not found",
        });
      }

      // Hapus image dari Cloudinary
      const imageUrl = imageTopic.image_url;
      if (imageUrl) {
        try {
          // Extract public_id dari URL
          const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image'
          });
          console.log("🗑️ Image deleted from Cloudinary");
        } catch (deleteError) {
          console.error("Failed to delete image from Cloudinary:", deleteError);
        }
      }

      // Hapus dari database
      await SkorSwaraImage.destroy({
        where: { image_id: id },
        transaction,
      });

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: "Image topic deleted successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Delete Image Topic Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete image topic",
        error: error.message,
      });
    }
  }

  static async updateImageTopic(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { image_keyword, image_topic, level } = req.body;

      const existingImageTopic = await SkorSwaraImage.findByPk(id, { transaction });

      if (!existingImageTopic) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Image topic not found",
        });
      }

      const updateData = {
        image_keyword: image_keyword || existingImageTopic.image_keyword,
        image_topic: image_topic || existingImageTopic.image_topic,
        level: level || existingImageTopic.level,
      };

      if (req.file) {
        updateData.image_url = req.file.path;

        const oldImageUrl = existingImageTopic.image_url;
        if (oldImageUrl) {
          try {
            const publicId = oldImageUrl.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
          } catch (deleteErr) {
            console.error("Failed to delete old image:", deleteErr);
          }
        }
      }

      await SkorSwaraImage.update(updateData, {
        where: { image_id: id },
        transaction,
      });

      // GET NEW DATA BEFORE COMMIT
      const updatedImageTopic = await SkorSwaraImage.findByPk(id, { transaction });

      await transaction.commit();

      res.status(200).json({
        success: true,
        message: "Image topic updated successfully",
        data: updatedImageTopic,
      });
    } catch (error) {
      // Only rollback if still active
      if (!transaction.finished) {
        await transaction.rollback();
      }

      res.status(500).json({
        success: false,
        message: "Failed to update image topic",
        error: error.message,
      });
    }
  }

}

module.exports = SkorSwaraController;
