module.exports = (sequelize, DataTypes) => {
  const BasicTrainingMaterial = sequelize.define(
    "BasicTrainingMaterial",
    {
      basic_training_material_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      basic_training_level_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "basic_training_levels",
          key: "basic_training_level_id",
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Content is required" },
        },
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      tableName: "basic_training_materials",
      timestamps: false,
    }
  );

  BasicTrainingMaterial.associate = (models) => {
    BasicTrainingMaterial.belongsTo(models.BasicTrainingLevel, {
      foreignKey: "basic_training_level_id",
      as: "level",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return BasicTrainingMaterial;
};
