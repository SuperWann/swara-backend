module.exports = (sequelize, DataTypes) => {
  const SkorSwaraImage = sequelize.define(
    "SkorSwaraImage",
    {
      image_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      skor_swara_topic_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "skor_swara_topics",
          key: "skor_swara_topic_id",
        },
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Image URL is required" },
          isUrl: { msg: "Must be a valid URL" },
        },
      },
      image_description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Optional description of the image",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "skor_swara_images",
      timestamps: false,
    }
  );

  SkorSwaraImage.associate = (models) => {
    SkorSwaraImage.belongsTo(models.SkorSwaraTopic, {
      foreignKey: "skor_swara_topic_id",
      as: "topic",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SkorSwaraImage.hasMany(models.SkorSwara, {
      foreignKey: "image_id",
      as: "skor_swara_sessions",
    });
  };

  return SkorSwaraImage;
};
