module.exports = (sequelize, DataTypes) => {
  const SkorSwaraMode = sequelize.define(
    "SkorSwaraMode",
    {
      mode_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      mode_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "Mode name is required" },
        },
      },
      mode_type: {
        type: DataTypes.ENUM('text', 'image', 'custom'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['text', 'image', 'custom']],
            msg: "Mode type must be 'text', 'image', or 'custom'",
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "skor_swara_modes",
      timestamps: false,
    }
  );

  SkorSwaraMode.associate = (models) => {
    SkorSwaraMode.hasMany(models.SkorSwara, {
      foreignKey: "mode_id",
      as: "skor_swara_sessions",
    });
  };

  return SkorSwaraMode;
};
