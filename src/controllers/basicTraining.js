const {
  BasicTrainingMode,
  BasicTrainingLevel,
  BasicTrainingSession,
  BasicTrainingMaterial,
  BasicTrainingMaterialAssessment,
  User,
  sequelize,
} = require("../models");
const aiService = require("../services/aiService");
const artikulasiAiService = require("../services/artikulasiAiService");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

class BasicTrainingController {
  static async getAllModes(req, res) {
    try {
      const userId = req.user.user_id;

      const modes = await BasicTrainingMode.findAll({
        where: { is_active: true },
        attributes: [
          "basic_training_mode_id",
          "name",
          "slug",
          "description",
          "icon",
          "color",
        ],
        include: [
          {
            model: BasicTrainingLevel,
            as: "levels",
            where: { is_active: true },
            attributes: ["basic_training_level_id", "level", "minimum_score"],
            required: false,
          },
        ],
        order: [
          ["order_index", "ASC"],
          [{ model: BasicTrainingLevel, as: "levels" }, "level", "ASC"],
        ],
      });

      const modesWithProgress = await Promise.all(
        modes.map(async (mode) => {
          const modeData = mode.toJSON();
          const totalLevels = modeData.levels.length;

          const completedLevels = await BasicTrainingSession.count({
            where: {
              user_id: userId,
              status: "completed",
            },
            include: [
              {
                model: BasicTrainingLevel,
                as: "level",
                where: {
                  basic_training_mode_id: mode.basic_training_mode_id,
                },
                attributes: [],
                required: true,
              },
            ],
            distinct: true,
            col: "basic_training_level_id",
          });

          const percentage =
            totalLevels > 0
              ? Math.round((completedLevels / totalLevels) * 100)
              : 0;

          return {
            basic_training_mode_id: modeData.basic_training_mode_id,
            name: modeData.name,
            slug: modeData.slug,
            description: modeData.description,
            icon: modeData.icon,
            color: modeData.color,
            progress: {
              total_levels: totalLevels,
              completed_levels: completedLevels,
              percentage: percentage,
            },
          };
        })
      );

      res.json({
        success: true,
        message: "Modes retrieved successfully",
        data: modesWithProgress,
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
      const userId = req.user.user_id;

      const mode = await BasicTrainingMode.findOne({
        where: {
          basic_training_mode_id: id,
          is_active: true,
        },
        attributes: [
          "basic_training_mode_id",
          "name",
          "slug",
          "description",
          "icon",
          "color",
        ],
        include: [
          {
            model: BasicTrainingLevel,
            as: "levels",
            where: { is_active: true },
            attributes: [
              "basic_training_level_id",
              "level",
              "name",
              "description",
              "minimum_score",
              "instruction",
            ],
            include: [
              {
                model: BasicTrainingMaterial,
                as: "materials",
                where: { is_active: true },
                attributes: [
                  "basic_training_material_id",
                  "content",
                  "order_index",
                ],
                required: false,
              },
            ],
            required: false,
          },
        ],
        order: [
          [{ model: BasicTrainingLevel, as: "levels" }, "level", "ASC"],
          [
            { model: BasicTrainingLevel, as: "levels" },
            { model: BasicTrainingMaterial, as: "materials" },
            "order_index",
            "ASC",
          ],
        ],
      });

      if (!mode) {
        return res.status(404).json({
          success: false,
          message: "Mode not found",
        });
      }

      const user = await User.findByPk(userId, {
        attributes: ["user_id", "full_name"],
      });

      const userScores = await BasicTrainingSession.findAll({
        where: {
          user_id: userId,
          status: "completed",
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            where: {
              basic_training_mode_id: mode.basic_training_mode_id,
            },
            attributes: ["basic_training_level_id", "level"],
            required: true,
          },
        ],
        attributes: [
          "basic_training_level_id",
          [sequelize.fn("MAX", sequelize.col("total_score")), "best_score"],
          [
            sequelize.fn("COUNT", sequelize.col("basic_training_session_id")),
            "attempts",
          ],
        ],
        group: ["basic_training_level_id"],
        raw: true,
      });

      const scoresMap = {};
      userScores.forEach((score) => {
        scoresMap[score.basic_training_level_id] = {
          best_score: parseFloat(score.best_score || 0),
          attempts: parseInt(score.attempts || 0),
        };
      });

      const levelsWithStatus = mode.levels.map((level, index) => {
        const levelData = level.toJSON();
        let isUnlocked = false;
        let isCompleted = false;
        let bestScore = 0;
        let attempts = 0;

        if (levelData.level === 1) {
          isUnlocked = true;
        } else if (index > 0) {
          const prevLevel = mode.levels[index - 1];
          const prevScore = scoresMap[prevLevel.basic_training_level_id];
          if (prevScore && prevScore.best_score >= prevLevel.minimum_score) {
            isUnlocked = true;
          }
        }

        const currentScore = scoresMap[levelData.basic_training_level_id];
        if (currentScore) {
          bestScore = currentScore.best_score;
          attempts = currentScore.attempts;
          isCompleted = bestScore >= levelData.minimum_score;
        }

        return {
          ...levelData,
          is_unlocked: isUnlocked,
          is_completed: isCompleted,
          user_progress: {
            best_score: bestScore,
            total_attempts: attempts,
          },
        };
      });

      res.json({
        success: true,
        message: "Mode detail retrieved successfully",
        data: {
          ...mode.toJSON(),
          levels: levelsWithStatus,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get mode detail",
        error: error.message,
      });
    }
  }

  static async startTraining(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { basic_training_level_id } = req.body;

      const level = await BasicTrainingLevel.findOne({
        where: {
          basic_training_level_id,
          is_active: true,
        },
        include: [
          {
            model: BasicTrainingMode,
            as: "mode",
            where: { is_active: true },
            attributes: ["basic_training_mode_id", "name", "slug"],
          },
        ],
        transaction,
      });

      if (!level) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Training level not found or inactive",
        });
      }

      if (level.level > 1) {
        const prevLevel = await BasicTrainingLevel.findOne({
          where: {
            basic_training_mode_id: level.basic_training_mode_id,
            level: level.level - 1,
          },
          transaction,
        });

        if (prevLevel) {
          const prevBestScore = await BasicTrainingSession.findOne({
            where: {
              user_id: userId,
              basic_training_level_id: prevLevel.basic_training_level_id,
              status: "completed",
            },
            attributes: [
              [sequelize.fn("MAX", sequelize.col("total_score")), "best_score"],
            ],
            raw: true,
            transaction,
          });

          if (
            !prevBestScore ||
            parseFloat(prevBestScore.best_score || 0) < prevLevel.minimum_score
          ) {
            await transaction.rollback();
            return res.status(403).json({
              success: false,
              message: "Previous level must be completed first",
              data: {
                required_level: prevLevel.level,
                required_score: prevLevel.minimum_score,
              },
            });
          }
        }
      }

      const session = await BasicTrainingSession.create(
        {
          user_id: userId,
          basic_training_level_id: level.basic_training_level_id,
          status: "started",
          started_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Training session started successfully",
        data: {
          basic_training_session_id: session.basic_training_session_id,
          level: {
            basic_training_level_id: level.basic_training_level_id,
            level: level.level,
            name: level.name,
            description: level.description,
            instruction: level.instruction,
            minimum_score: level.minimum_score,
          },
          mode: level.mode,
          status: session.status,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to start training session",
        error: error.message,
      });
    }
  }

  static async uploadAndAnalyze(req, res) {
    let videoPath = null;
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { basic_training_session_id } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video file is required",
        });
      }

      videoPath = req.file.path;

      if (!basic_training_session_id) {
        await fsPromises.unlink(videoPath);
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
        });
      }

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: ["basic_training_mode_id", "name", "slug"],
              },
            ],
          },
        ],
        transaction,
      });

      if (!session) {
        await fsPromises.unlink(videoPath);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      if (session.status === "completed") {
        await fsPromises.unlink(videoPath);
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "This session has already been completed",
        });
      }

      await session.update(
        {
          video_path: videoPath,
          status: "uploaded",
        },
        { transaction }
      );

      await transaction.commit();

      try {
        const aiResult = await aiService.analyzeBasicTraining(
          videoPath,
          session.level.mode.slug,
          {
            level: session.level.level,
            level_name: session.level.name,
            instruction: session.level.instruction,
          }
        );

        const updateTransaction = await sequelize.transaction();
        try {
          await session.update(
            {
              status: "completed",
              articulation_score: aiResult.articulation_score || 0,
              expression_score: aiResult.expression_score || 0,
              tempo_score: aiResult.tempo_score || 0,
              total_score: aiResult.total_score || 0,
              finished_at: new Date(),
            },
            { transaction: updateTransaction }
          );

          await updateTransaction.commit();

          res.json({
            success: true,
            message: "Video analyzed successfully",
            data: {
              basic_training_session_id: session.basic_training_session_id,
              level: session.level,
              scores: {
                articulation_score: aiResult.articulation_score || 0,
                expression_score: aiResult.expression_score || 0,
                tempo_score: aiResult.tempo_score || 0,
                total_score: aiResult.total_score || 0,
              },
              is_passed:
                (aiResult.total_score || 0) >= session.level.minimum_score,
              status: "completed",
            },
          });
        } catch (updateError) {
          await updateTransaction.rollback();
          throw updateError;
        }
      } catch (aiError) {
        const failTransaction = await sequelize.transaction();
        try {
          await session.update(
            {
              status: "failed",
            },
            { transaction: failTransaction }
          );
          await failTransaction.commit();
        } catch (failUpdateError) {
          await failTransaction.rollback();
        }

        throw aiError;
      }
    } catch (error) {
      await transaction.rollback();

      if (videoPath) {
        try {
          await fsPromises.unlink(videoPath);
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

  static async getSessionDetail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id: id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: [
                  "basic_training_mode_id",
                  "name",
                  "slug",
                  "icon",
                  "color",
                ],
              },
            ],
          },
        ],
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      res.json({
        success: true,
        message: "Session detail retrieved successfully",
        data: {
          basic_training_session_id: session.basic_training_session_id,
          level: session.level,
          status: session.status,
          scores: {
            articulation_score: session.articulation_score,
            expression_score: session.expression_score,
            tempo_score: session.tempo_score,
            total_score: session.total_score,
          },
          is_passed: session.total_score >= session.level.minimum_score,
          started_at: session.started_at,
          finished_at: session.finished_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get session detail",
        error: error.message,
      });
    }
  }

  static async getHistory(req, res) {
    try {
      const userId = req.user.user_id;
      const { page = 1, limit = 20, mode_id } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {
        user_id: userId,
        status: "completed",
      };

      const levelInclude = {
        model: BasicTrainingLevel,
        as: "level",
        attributes: [
          "basic_training_level_id",
          "level",
          "name",
          "minimum_score",
        ],
        include: [
          {
            model: BasicTrainingMode,
            as: "mode",
            attributes: [
              "basic_training_mode_id",
              "name",
              "slug",
              "icon",
              "color",
            ],
          },
        ],
      };

      if (mode_id) {
        levelInclude.where = {
          basic_training_mode_id: mode_id,
        };
      }

      const { count, rows: sessions } =
        await BasicTrainingSession.findAndCountAll({
          where: whereClause,
          include: [levelInclude],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["finished_at", "DESC"]],
          distinct: true,
        });

      res.json({
        success: true,
        message: "Training history retrieved successfully",
        data: {
          sessions: sessions,
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
        message: "Failed to get training history",
        error: error.message,
      });
    }
  }

  static async assessArticulationMaterial(req, res) {
    const transaction = await sequelize.transaction();
    let audioPath = null;

    try {
      const userId = req.user.user_id;
      const { basic_training_session_id, basic_training_material_id } =
        req.body;

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: ["basic_training_mode_id", "name", "slug"],
              },
            ],
          },
        ],
        transaction,
      });

      if (!session) {
        await transaction.rollback();
        if (req.file) {
          await fsPromises.unlink(req.file.path).catch(() => {});
        }
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      const mode = session.level.mode.slug;

      if (mode === "artikulasi") {
        if (!req.file) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Audio file is required for Artikulasi mode",
          });
        }
        audioPath = req.file.path;
      } else if (mode === "ekspresi") {
        const { overall_score, detection } = req.body;
        if (!overall_score) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Overall score is required for Ekspresi mode",
          });
        }
      } else if (mode === "tempo") {
        const { overall_score, wpm } = req.body;
        if (!overall_score) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Overall score is required for Tempo mode",
          });
        }
      } else {
        await transaction.rollback();
        if (req.file) {
          await fsPromises.unlink(req.file.path).catch(() => {});
        }
        return res.status(400).json({
          success: false,
          message: `Unsupported mode: ${mode}`,
        });
      }

      if (mode === "artikulasi") {
        const material = await BasicTrainingMaterial.findOne({
          where: {
            basic_training_material_id,
            basic_training_level_id: session.basic_training_level_id,
            is_active: true,
          },
          transaction,
        });

        if (!material) {
          await transaction.rollback();
          if (audioPath) {
            await fsPromises.unlink(audioPath).catch(() => {});
          }
          return res.status(404).json({
            success: false,
            message: "Material not found for this level",
          });
        }

        let assessment = await BasicTrainingMaterialAssessment.findOne({
          where: {
            basic_training_session_id,
            basic_training_material_id,
          },
          transaction,
        });

        let isRetry = false;

        if (assessment) {
          if (assessment.grade === 'A') {
            await transaction.rollback();
            if (audioPath) {
              await fsPromises.unlink(audioPath).catch(() => {});
            }
            return res.status(400).json({
              success: false,
              message: "Material ini sudah mendapat grade A. Tidak perlu retry lagi.",
              data: {
                current_grade: assessment.grade,
                current_score: assessment.overall_score
              }
            });
          }

          console.log(`Retry attempt for material ${basic_training_material_id}, current grade: ${assessment.grade}`);
          isRetry = true;

          if (assessment.audio_path && fs.existsSync(assessment.audio_path)) {
            try {
              fs.unlinkSync(assessment.audio_path);
              console.log('Old audio file deleted');
            } catch (err) {
              console.error('Failed to delete old audio:', err.message);
            }
          }

          await assessment.update({
            audio_path: audioPath,
            status: "pending",
          }, { transaction });

        } else {
          assessment = await BasicTrainingMaterialAssessment.create(
            {
              basic_training_session_id,
              basic_training_material_id,
              audio_path: audioPath,
              target_text: material.content,
              status: "pending",
            },
            { transaction }
          );
        }

        await transaction.commit();

        try {
          console.log(
            `Calling AI for material assessment: target="${material.content}", level=${session.level.level}`
          );

          const audioBuffer = fs.readFileSync(audioPath);
          const originalFilename = path.basename(audioPath);

          console.log(`Audio file size: ${audioBuffer.length} bytes`);

          const aiResponse = await artikulasiAiService.analyzeArticulation(
            audioBuffer,
            material.content,
            session.level.level,
            originalFilename
          );

          const normalizedData = artikulasiAiService.validateResponse(aiResponse);

          await assessment.update({
            detected_text: normalizedData.detected_text,
            overall_score: normalizedData.overall_score,
            grade: normalizedData.grade,
            clarity_score: normalizedData.clarity_score,
            energy_score: normalizedData.energy_score,
            speech_rate_score: normalizedData.speech_rate_score,
            pitch_consistency_score: normalizedData.pitch_consistency_score,
            snr_score: normalizedData.snr_score,
            articulation_score: normalizedData.articulation_score,
            similarity_score: normalizedData.similarity_score,
            wer: normalizedData.wer,
            feedback_message: normalizedData.feedback_message,
            feedback_suggestions: normalizedData.feedback_suggestions,
            ai_response: normalizedData.ai_response,
            status: "completed",
          });

          res.json({
            success: true,
            message: isRetry 
              ? `Retry berhasil! Grade sebelumnya diperbaharui.` 
              : "Material assessed successfully",
            data: {
              assessment_id: assessment.assessment_id,
              is_retry: isRetry,
              material: {
                basic_training_material_id: material.basic_training_material_id,
                content: material.content,
                order_index: material.order_index,
              },
              results: {
                overall: {
                  score: normalizedData.overall_score,
                  grade: normalizedData.grade,
                },
                transcription: {
                  target: normalizedData.target_text,
                  detected: normalizedData.detected_text,
                  similarity: normalizedData.similarity_score,
                  wer: normalizedData.wer,
                },
                scores: {
                  clarity: normalizedData.clarity_score,
                  energy: normalizedData.energy_score,
                  speech_rate: normalizedData.speech_rate_score,
                  pitch_consistency: normalizedData.pitch_consistency_score,
                  snr: normalizedData.snr_score,
                  articulation: normalizedData.articulation_score,
                },
                feedback: {
                  message: normalizedData.feedback_message,
                  suggestions: normalizedData.feedback_suggestions,
                },
              },
            },
          });
        } catch (aiError) {
          console.error("AI Service Error:", aiError);

          await assessment.update({
            status: "failed",
            feedback_message: aiError.message,
          });

          res.status(500).json({
            success: false,
            message: "Failed to analyze audio",
            error: aiError.message,
          });
        }
      }
    } catch (error) {
      await transaction.rollback();

      if (audioPath) {
        await fsPromises.unlink(audioPath).catch(() => {});
      }

      res.status(500).json({
        success: false,
        message: error.message || "Failed to assess material",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async completeArtikulasiSession(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const { basic_training_session_id } = req.body;

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: ["basic_training_mode_id", "name", "slug"],
              },
              {
                model: BasicTrainingMaterial,
                as: "materials",
                where: { is_active: true },
                required: false,
              },
            ],
          },
          {
            model: BasicTrainingMaterialAssessment,
            as: "materialAssessments",
            where: { status: "completed" },
            required: false,
          },
        ],
        transaction,
      });

      if (!session) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      if (session.level.mode.slug !== "artikulasi") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "This endpoint only supports Artikulasi mode",
        });
      }

      const totalMaterials = session.level.materials.length;
      const assessedMaterials = session.materialAssessments.length;

      if (assessedMaterials < totalMaterials) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Please complete all materials. Assessed: ${assessedMaterials}/${totalMaterials}`,
          data: {
            total_materials: totalMaterials,
            assessed_materials: assessedMaterials,
            remaining: totalMaterials - assessedMaterials,
          },
        });
      }

      const aggregatedScores = artikulasiAiService.calculateLevelScore(
        session.materialAssessments.map((a) => ({
          overall_score: parseFloat(a.overall_score || 0),
          articulation_score: parseFloat(a.articulation_score || 0),
          clarity_score: parseFloat(a.clarity_score || 0),
        }))
      );

      await session.update(
        {
          articulation_score: aggregatedScores.articulation_score,
          total_score: aggregatedScores.total_score,
          status: "completed",
          finished_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();

      const isPassed =
        aggregatedScores.total_score >= session.level.minimum_score;

      res.json({
        success: true,
        message: isPassed
          ? "Congratulations! You passed this level!"
          : "Session completed. Keep practicing to improve your score!",
        data: {
          session_id: session.basic_training_session_id,
          level: {
            level: session.level.level,
            name: session.level.name,
            minimum_score: session.level.minimum_score,
          },
          scores: {
            total_score: aggregatedScores.total_score,
            articulation_score: aggregatedScores.articulation_score,
            clarity_score: aggregatedScores.clarity_score,
            grade: artikulasiAiService.getGrade(aggregatedScores.total_score),
          },
          materials_summary: {
            total_materials: aggregatedScores.total_materials,
            passed_materials: aggregatedScores.passed_materials,
          },
          is_passed: isPassed,
          finished_at: session.finished_at,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        message: "Failed to complete session",
        error: error.message,
      });
    }
  }

  static async getSessionAssessments(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id: id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: [
                  "basic_training_mode_id",
                  "name",
                  "slug",
                  "icon",
                  "color",
                ],
              },
            ],
          },
          {
            model: BasicTrainingMaterialAssessment,
            as: "materialAssessments",
            include: [
              {
                model: BasicTrainingMaterial,
                as: "material",
                attributes: [
                  "basic_training_material_id",
                  "content",
                  "order_index",
                ],
              },
            ],
            order: [
              [
                { model: BasicTrainingMaterial, as: "material" },
                "order_index",
                "ASC",
              ],
            ],
          },
        ],
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      const assessmentDetails = session.materialAssessments.map(
        (assessment) => ({
          assessment_id: assessment.assessment_id,
          material: {
            material_id: assessment.material.basic_training_material_id,
            content: assessment.material.content,
            order_index: assessment.material.order_index,
          },
          target_text: assessment.target_text,
          detected_text: assessment.detected_text,
          scores: {
            overall: assessment.overall_score,
            grade: assessment.grade,
            clarity: assessment.clarity_score,
            articulation: assessment.articulation_score,
            similarity: assessment.similarity_score,
          },
          feedback: {
            message: assessment.feedback_message,
            suggestions: assessment.feedback_suggestions,
          },
          status: assessment.status,
        })
      );

      res.json({
        success: true,
        message: "Session assessments retrieved successfully",
        data: {
          session_id: session.basic_training_session_id,
          level: session.level,
          status: session.status,
          total_score: session.total_score,
          articulation_score: session.articulation_score,
          assessments: assessmentDetails,
          started_at: session.started_at,
          finished_at: session.finished_at,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to get session assessments",
        error: error.message,
      });
    }
  }



  static async completeNonArtikulasiSession(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const userId = req.user.user_id;
      const {
        basic_training_session_id,
        total_score,
        feedback,
        materials,
        wpm,
      } = req.body;

      const session = await BasicTrainingSession.findOne({
        where: {
          basic_training_session_id,
          user_id: userId,
        },
        include: [
          {
            model: BasicTrainingLevel,
            as: "level",
            include: [
              {
                model: BasicTrainingMode,
                as: "mode",
                attributes: ["basic_training_mode_id", "name", "slug"],
              },
            ],
          },
        ],
        transaction,
      });

      if (!session) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      const mode = session.level.mode.slug;

      if (!["ekspresi", "tempo"].includes(mode)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "This endpoint only supports Ekspresi and Tempo mode",
        });
      }

      if (session.status === "completed") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Session already completed",
        });
      }

      if (materials && Array.isArray(materials)) {
        for (const material of materials) {
          const assessmentData = {
            basic_training_session_id,
            basic_training_material_id: material.material_id,
            target_text: material.content || "",
            overall_score: parseFloat(material.score),
            grade: BasicTrainingController.calculateGrade(material.score),
            status: "completed",
          };

          if (mode === "ekspresi" && material.detection) {
            assessmentData.detections = material.detection;
          } else if (mode === "tempo" && material.wpm) {
            assessmentData.wpm = parseFloat(material.wpm);
          }

          await BasicTrainingMaterialAssessment.create(assessmentData, {
            transaction,
          });
        }
      }

      const updateData = {
        total_score: parseFloat(total_score),
        status: "completed",
        finished_at: new Date(),
      };

      if (mode === "ekspresi") {
        updateData.expression_score = parseFloat(total_score);
      } else if (mode === "tempo") {
        updateData.tempo_score = parseFloat(total_score);
      }

      await session.update(updateData, { transaction });

      await transaction.commit();

      const responseData = {
        session_id: session.basic_training_session_id,
        mode: mode,
        total_score: session.total_score,
        grade: BasicTrainingController.calculateGrade(total_score),
        feedback: feedback,
      };

      if (mode === "ekspresi") {
        responseData.expression_score = session.expression_score;
      } else if (mode === "tempo") {
        responseData.tempo_score = session.tempo_score;
        if (wpm) {
          responseData.average_wpm = parseFloat(wpm);
        }
      }

      res.json({
        success: true,
        message: `${mode.charAt(0).toUpperCase() + mode.slice(1)} session completed successfully`,
        data: responseData,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error in completeNonArtikulasiSession:", error);
      res.status(500).json({
        success: false,
        message: "Failed to complete session",
        error: error.message,
      });
    }
  }

  static calculateGrade(score) {
    const numScore = parseFloat(score);
    if (numScore >= 90) return "A";
    if (numScore >= 80) return "B";
    if (numScore >= 70) return "C";
    if (numScore >= 60) return "D";
    return "E";
  }
}

module.exports = BasicTrainingController;
