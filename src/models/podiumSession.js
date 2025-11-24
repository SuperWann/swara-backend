module.exports = (sequelize, DataTypes) => {
  const PodiumSession = sequelize.define('PodiumSession', {
    podium_session_id: {
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
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'podium_sessions',
    timestamps: false
  });

  PodiumSession.associate = function (models) {
    PodiumSession.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    PodiumSession.belongsTo(models.PodiumCategory, { foreignKey: "podium_category_id", as: "podium_category" });
    PodiumSession.belongsTo(models.PodiumText, { foreignKey: "podium_text_id", as: "podium_text" });

    // One-to-One
    PodiumSession.hasOne(models.ProgressPodium, {
      foreignKey: "podium_session_id",
      as: "progress",
    });

    PodiumSession.hasMany(models.PodiumInterviewResult, {
      foreignKey: "podium_session_id",
      as: "interview_results",
    });
  };

  return PodiumSession;
};
