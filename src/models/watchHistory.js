module.exports = (sequelize, DataTypes) => {
  const WatchHistory = sequelize.define('WatchHistory', {
    watch_history_id: {
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
    content_swara_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'content_swara',
        key: 'content_swara_id'
      }
    },
    watched_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    watch_duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration watched in seconds'
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'watch_history',
    timestamps: false,
    indexes: [
      {
        unique: false,
        fields: ['user_id']
      },
      {
        unique: false,
        fields: ['content_swara_id']
      },
      {
        unique: false,
        fields: ['watched_at']
      }
    ]
  });

  WatchHistory.associate = (models) => {
    WatchHistory.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    WatchHistory.belongsTo(models.ContentSwara, {
      foreignKey: 'content_swara_id',
      as: 'content'
    });
  };

  return WatchHistory;
};
