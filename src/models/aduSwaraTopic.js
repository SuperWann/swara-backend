module.exports = (sequelize, DataTypes) => {
  const AduSwaraTopic = sequelize.define('AduSwaraTopic', {
    adu_swara_topic_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Title is required' }
      }
    },
    keywords: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    adu_swara_category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'adu_swara_categories',
        key: 'adu_swara_category_id'
      }
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'adu_swara_topics',
    timestamps: false
  });

  AduSwaraTopic.associate = (models) => {
    AduSwaraTopic.belongsTo(models.AduSwaraCategory, {
      foreignKey: 'adu_swara_category_id',
      as: 'category'
    });

    AduSwaraTopic.hasMany(models.Match, {
      foreignKey: 'adu_swara_topic_id',
      as: 'matches'
    });
  };

  return AduSwaraTopic;
};
