module.exports = (sequelize, DataTypes) => {
  const BasicTrainingMaterialAssessment = sequelize.define(
    "BasicTrainingMaterialAssessment",
    {
      assessment_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      basic_training_session_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "basic_training_sessions",
          key: "basic_training_session_id",
        },
      },
      basic_training_material_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "basic_training_materials",
          key: "basic_training_material_id",
        },
      },
      audio_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      target_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Text that user should pronounce",
      },
      detected_text: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Text detected by AI",
      },
      detections: {
        type: DataTypes.DECIMAL,
        allowNull: true,
        comment: "How many expression detected by AI",
      },
      wpm: {
        type: DataTypes.DECIMAL,
        allowNull: true,
        comment: "Words per minute",
      },
      overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: "Overall score cannot be negative" },
          max: { args: [100], msg: "Overall score cannot exceed 100" },
        },
      },
      grade: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: "Grade: A, B, C, D, E",
      },
      clarity_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      energy_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      speech_rate_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      pitch_consistency_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      snr_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      articulation_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      similarity_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "Text similarity percentage",
      },
      wer: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: "Word Error Rate",
      },
      feedback_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      feedback_suggestions: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Array of suggestions from AI",
      },
      ai_response: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Full AI response for debugging",
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "basic_training_material_assessments",
      timestamps: false,
    }
  );

  BasicTrainingMaterialAssessment.associate = (models) => {
    BasicTrainingMaterialAssessment.belongsTo(models.BasicTrainingSession, {
      foreignKey: "basic_training_session_id",
      as: "session",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    BasicTrainingMaterialAssessment.belongsTo(models.BasicTrainingMaterial, {
      foreignKey: "basic_training_material_id",
      as: "material",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return BasicTrainingMaterialAssessment;
};
