module.exports = (sequelize, DataTypes) => {
  const SkorSwara = sequelize.define(
    "SkorSwara",
    {
      skor_swara_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      point_earned: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      skor_swara_topic_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "skor_swara_topics",
          key: "skor_swara_topic_id",
        },
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
      },
      image_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: "skor_swara_images",
          key: "image_id",
        },
      },
      mode_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
          model: "skor_swara_modes",
          key: "mode_id",
        },
      },
      custom_topic: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      custom_keyword: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tempo: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      artikulasi: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      kontak_mata: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      kesesuaian_topik: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      struktur: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      jeda: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      first_impression: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      ekspresi: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      gestur: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      kata_pengisi: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      kata_tidak_senonoh: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: 'created_at', // Mapping ke kolom database
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
        field: 'updated_at', // Mapping ke kolom database
      },
    },
    {
      tableName: "skor_swara",
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  SkorSwara.associate = (models) => {
    SkorSwara.belongsTo(models.SkorSwaraTopic, {
      foreignKey: "skor_swara_topic_id",
      as: "skor_swara_topic",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SkorSwara.belongsTo(models.SkorSwaraMode, {
      foreignKey: "mode_id",
      as: "mode",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    SkorSwara.belongsTo(models.SkorSwaraImage, {
      foreignKey: "image_id",
      as: "image",
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });

    SkorSwara.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return SkorSwara;
};
