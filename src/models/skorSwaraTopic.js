module.exports = (sequelize, DataTypes) => {
  const SkorSwaraTopic = sequelize.define(
    "SkorSwaraTopic",
    {
      skor_swara_topic_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      topic: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Topic is required" },
        },
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Text is required" },
        },
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: { msg: "Level is required" },
          isIn: {
            args: [[1, 2, 3, 4, 5]],
            msg: "Level must be 1, 2, 3, 4, or 5",
          },
        },
      }
    },
    {
      tableName: "skor_swara_topics",
      timestamps: false,
    }
  );

  SkorSwaraTopic.associate = (models) => {
    SkorSwaraTopic.hasMany(models.SkorSwara, {
      foreignKey: "skor_swara_topic_id",
      as: "skor_swara",
    });
  };

  return SkorSwaraTopic;
};
