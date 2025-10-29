module.exports = (sequelize, DataTypes) => {
  const ProgressPodium = sequelize.define('ProgressPodium', {
    progress_podium_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    self_confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Self confidence is required' }
      }
    },
    time_management: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Time management is required' }
      }
    },
    audiens_interest: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Audience interest is required' }
      }
    },
    sentence_structure: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Sentence structure is required' }
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
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'progress_podiums',
    timestamps: false
  });

  ProgressPodium.associate = (models) => {
    ProgressPodium.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    ProgressPodium.belongsTo(models.PodiumCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });
  };

  return ProgressPodium;
};
