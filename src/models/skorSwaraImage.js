module.exports = (sequelize, DataTypes) => {
  const SkorSwaraImage = sequelize.define(
    "SkorSwaraImage",
    {
      image_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Image URL is required" },
          isUrl: { msg: "Must be a valid URL" },
        },
      },
      image_topic: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Image topic is required" },
        },
      },
      image_keyword: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional description of the image",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Level is required" },
        }
      }
    },
    {
      tableName: "skor_swara_images",
      timestamps: false,
    }
  );

  SkorSwaraImage.associate = (models) => {
    SkorSwaraImage.hasMany(models.SkorSwara, {
      foreignKey: "image_id",
      as: "skor_swara_sessions",
    });
  };

  return SkorSwaraImage;
};
