module.exports = (sequelize, DataTypes) => {
  const BasicTrainingMode = sequelize.define(
    "BasicTrainingMode",
    {
      basic_training_mode_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: { msg: "Mode name already exists" },
        validate: {
          notEmpty: { msg: "Name is required" },
        },
      },
      slug: {
        type: DataTypes.ENUM("artikulasi", "ekspresi", "tempo"),
        allowNull: false,
        unique: { msg: "Slug already exists" },
        validate: {
          notEmpty: { msg: "Slug is required" },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      color: {
        type: DataTypes.STRING(50),
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
      tableName: "basic_training_modes",
      timestamps: false,
    }
  );

  BasicTrainingMode.associate = (models) => {
    BasicTrainingMode.hasMany(models.BasicTrainingLevel, {
      foreignKey: "basic_training_mode_id",
      as: "levels",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return BasicTrainingMode;
};
