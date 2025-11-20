module.exports = (sequelize, DataTypes) => {
  const PodiumText = sequelize.define('PodiumText', {
    podium_text_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    topic: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Podium topic is required' }
      }
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Podium text is required' }
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'podium_texts',
    timestamps: false
  });

  PodiumText.associate = function (models) {
    PodiumText.hasMany(models.ProgressPodium, { foreignKey: 'podium_text_id' });
  };

  return PodiumText;
};
