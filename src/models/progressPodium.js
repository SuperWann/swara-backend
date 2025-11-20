module.exports = (sequelize, DataTypes) => {
  const ProgressPodium = sequelize.define('ProgressPodium', {
    progress_podium_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    podium_category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'podium_categories',
        key: 'podium_category_id'
      }
    },
    podium_text_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'podium_texts',
        key: 'podium_text_id'
      }
    },
    point_earned: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
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
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'progress_podium',
    timestamps: false
  });

  ProgressPodium.associate = (models) => {
    ProgressPodium.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'users'
    });

    ProgressPodium.belongsTo(models.PodiumCategory, {
      foreignKey: 'podium_category_id',
      as: 'category'
    });

    ProgressPodium.belongsTo(models.PodiumText, {
      foreignKey: 'podium_text_id',
      as: 'text'
    });
  };

  return ProgressPodium;
};
