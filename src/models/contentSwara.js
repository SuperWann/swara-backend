module.exports = (sequelize, DataTypes) => {
  const ContentSwara = sequelize.define('ContentSwara', {
    content_swara_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title is required' },
        len: { args: [1, 100], msg: 'Title must be between 1-100 characters' }
      }
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Thumbnail is required' }
      }
    },
    url_video: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Video URL is required' }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Description is required' }
      }
    },
    category_content_swara_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'category_content_swara',
        key: 'category_content_swara_id'
      }
    },
    level_content_swara_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'level_content_swara',
        key: 'level_content_swara_id'
      }
    },
    speaker: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Speaker is required' }
      }
    },
    video_duration: {
      type: DataTypes.TIME,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Video duration is required' }
      }
    },
    views: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Views cannot be negative' }
      }
    }
  }, {
    tableName: 'content_swara',
    timestamps: false
  });

  ContentSwara.associate = (models) => {
    ContentSwara.belongsTo(models.CategoryContentSwara, {
      foreignKey: 'category_content_swara_id',
      as: 'category'
    });
    ContentSwara.belongsTo(models.LevelContentSwara, {
      foreignKey: 'level_content_swara_id',
      as: 'level'
    });

    ContentSwara.belongsToMany(models.GayaPenyampaian, {
      through: 'gaya_penyampaian_contents',
      foreignKey: 'content_swara_id',
      otherKey: 'gaya_penyampaian_id',
      as: 'gayaPenyampaian'
    });

    ContentSwara.belongsToMany(models.Struktur, {
      through: 'struktur_contents',
      foreignKey: 'content_swara_id',
      otherKey: 'struktur_id',
      as: 'struktur'
    });

    ContentSwara.belongsToMany(models.TeknikPembuka, {
      through: 'teknik_pembuka_contents',
      foreignKey: 'content_swara_id',
      otherKey: 'teknik_pembuka_id',
      as: 'teknikPembuka'
    });

    ContentSwara.belongsToMany(models.Tag, {
      through: 'tag_contents',
      foreignKey: 'content_swara_id',
      otherKey: 'tag_id',
      as: 'tags'
    });

    ContentSwara.hasMany(models.Transkrip, {
      foreignKey: 'content_swara_id',
      as: 'transkrip'
    });

    ContentSwara.hasMany(models.WatchHistory, {
      foreignKey: 'content_swara_id',
      as: 'watchHistory'
    });
  };

  return ContentSwara;
};