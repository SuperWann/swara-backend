module.exports = (sequelize, DataTypes) => {
  const ProgressPodium = sequelize.define('ProgressPodium', {
    progress_podium_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
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
    podium_session_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true
    },
    video_url: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'progress_podium',
    timestamps: false
  });

  ProgressPodium.associate = (models) => {

    // ProgressPodium.belongsTo(models.PodiumCategory, {
    //   foreignKey: 'podium_category_id',
    //   as: 'category'
    // });

    ProgressPodium.belongsTo(models.PodiumSession, {
      foreignKey: 'podium_session_id',
      as: 'session'
    });
  };

  return ProgressPodium;
};
