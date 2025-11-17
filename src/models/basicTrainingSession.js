module.exports = (sequelize, DataTypes) => {
  const BasicTrainingSession = sequelize.define(
    "BasicTrainingSession",
    {
      basic_training_session_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      basic_training_level_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "basic_training_levels",
          key: "basic_training_level_id",
        },
      },
      video_path: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
          "started",
          "uploaded",
          "processing",
          "completed",
          "failed"
        ),
        allowNull: false,
        defaultValue: "started",
      },
      articulation_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: "Articulation score cannot be negative" },
          max: { args: [100], msg: "Articulation score cannot exceed 100" },
        },
      },
      expression_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: "Expression score cannot be negative" },
          max: { args: [100], msg: "Expression score cannot exceed 100" },
        },
      },
      tempo_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: "Tempo score cannot be negative" },
          max: { args: [100], msg: "Tempo score cannot exceed 100" },
        },
      },
      total_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: { args: [0], msg: "Total score cannot be negative" },
          max: { args: [100], msg: "Total score cannot exceed 100" },
        },
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      finished_at: {
        type: DataTypes.DATE,
        allowNull: true,
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
      tableName: "basic_training_sessions",
      timestamps: false,
    }
  );

  BasicTrainingSession.associate = (models) => {
    BasicTrainingSession.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    BasicTrainingSession.belongsTo(models.BasicTrainingLevel, {
      foreignKey: "basic_training_level_id",
      as: "level",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return BasicTrainingSession;
};
