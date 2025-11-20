module.exports = (sequelize, DataTypes) => {
  const BasicTrainingLevel = sequelize.define(
    "BasicTrainingLevel",
    {
      basic_training_level_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      basic_training_mode_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "basic_training_modes",
          key: "basic_training_mode_id",
        },
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: "Level must be at least 1" },
        },
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Name is required" },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      minimum_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [0], msg: "Minimum score cannot be negative" },
          max: { args: [100], msg: "Minimum score cannot exceed 100" },
        },
      },
      instruction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: "basic_training_levels",
      timestamps: false,
    }
  );

  BasicTrainingLevel.associate = (models) => {
    BasicTrainingLevel.belongsTo(models.BasicTrainingMode, {
      foreignKey: "basic_training_mode_id",
      as: "mode",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    BasicTrainingLevel.hasMany(models.BasicTrainingSession, {
      foreignKey: "basic_training_level_id",
      as: "sessions",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    BasicTrainingLevel.hasMany(models.BasicTrainingMaterial, {
      foreignKey: "basic_training_level_id",
      as: "materials",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return BasicTrainingLevel;
};
