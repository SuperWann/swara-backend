module.exports = (sequelize, DataTypes) => {
  const PodiumInterviewResult = sequelize.define(
    "PodiumInterviewResult",
    {
      interview_result_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      podium_session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      podium_interview_question_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },

      tempo: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      artikulasi: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      kontak_mata: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      kesesuaian_topik: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      struktur: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      jeda: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      first_impression: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      ekspresi: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      gestur: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      kata_pengisi: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      kata_tidak_senonoh: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      point_earned: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      video_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      keywords_score: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "podium_interview_results",
      timestamps: false,
    }
  );

  PodiumInterviewResult.associate = (models) => {
    PodiumInterviewResult.belongsTo(models.PodiumSession, {
      foreignKey: "podium_session_id",
      as: "session",
    });

    PodiumInterviewResult.belongsTo(models.PodiumInterviewQuestion, {
      foreignKey: "podium_interview_question_id",
      as: "question",
    });
  };

  return PodiumInterviewResult;
};
