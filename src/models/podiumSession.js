module.exports = (sequelize, DataTypes) => {
  const PodiumSession = sequelize.define('PodiumSession', {
    session_id: {
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
    category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'podium_categories',
        key: 'podium_category_id'
      }
    },
    session_type: {
      type: DataTypes.ENUM('interview', 'speech'),
      allowNull: false
    },
    content_data: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Stores questions or text that was given to user'
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'abandoned'),
      allowNull: false,
      defaultValue: 'active'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    progress_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'progress_podium',
        key: 'progress_podium_id'
      },
      comment: 'Reference to progress after completion'
    }
  }, {
    tableName: 'podium_sessions',
    timestamps: false,
    indexes: [
      {
        fields: ['user_id', 'status']
      },
      {
        fields: ['started_at']
      }
    ]
  });

  PodiumSession.associate = (models) => {
    PodiumSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    PodiumSession.belongsTo(models.PodiumCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });
    PodiumSession.belongsTo(models.ProgressPodium, {
      foreignKey: 'progress_id',
      as: 'progress'
    });
  };

  return PodiumSession;
};
