module.exports = (sequelize, DataTypes) => {
  const SkorSwara = sequelize.define(
    "SkorSwara",
    {
      skor_swara_id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      point_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: "Points cannot be negative" },
        },
      },
      kelancaran_point: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: "Kelancaran point cannot be negative" },
          max: { args: [5], msg: "Kelancaran point cannot exceed 5" },
        },
      },
      penggunaan_bahasa_point: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: "Penggunaan bahasa point cannot be negative" },
          max: { args: [5], msg: "Penggunaan bahasa point cannot exceed 5" },
        },
      },
      ekspresi_point: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: "Ekspresi point cannot be negative" },
          max: { args: [5], msg: "Ekspresi point cannot exceed 5" },
        },
      },
      kelancaran_suggest: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      penggunaan_bahasa_suggest: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      ekspresi_suggest: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "",
      },
      skor_swara_topic_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "skor_swara_topics",
          key: "skor_swara_topic_id",
        },
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
    },
    {
      tableName: "skor_swara",
      timestamps: false,
    }
  );

  SkorSwara.associate = (models) => {
    SkorSwara.belongsTo(models.SkorSwaraTopic, {
      foreignKey: "skor_swara_topic_id",
      as: "skor_swara_topic",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SkorSwara.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return SkorSwara;
};
