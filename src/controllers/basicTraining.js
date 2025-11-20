const {
  BasicTrainingMode,
  BasicTrainingLevel,
  BasicTrainingSession,
  BasicTrainingMaterial,
  User,
  sequelize,
} = require("../models");
const aiService = require("../services/aiService");
const fs = require("fs").promises;

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
          [{ model: BasicTrainingLevel, as: "levels" }, { model: BasicTrainingMaterial, as: "materials" }, "order_index", "ASC"],
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
          [
            sequelize.fn("MAX", sequelize.col("total_score")),
            "best_score",
          ],
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
          if (
            prevScore &&
            prevScore.best_score >= prevLevel.minimum_score
          ) {
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
              [
                sequelize.fn("MAX", sequelize.col("total_score")),
                "best_score",
              ],
            ],
            raw: true,
            transaction,
          });

          if (
            !prevBestScore ||
            parseFloat(prevBestScore.best_score || 0) <
              prevLevel.minimum_score
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
        await fs.unlink(videoPath);
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
        await fs.unlink(videoPath);
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Training session not found",
        });
      }

      if (session.status === "completed") {
        await fs.unlink(videoPath);
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
                attributes: ["basic_training_mode_id", "name", "slug", "icon", "color"],
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
            attributes: ["basic_training_mode_id", "name", "slug", "icon", "color"],
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
}

module.exports = BasicTrainingController;
