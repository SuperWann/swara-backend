module.exports = (sequelize, DataTypes) => {
  const PodiumText = sequelize.define('PodiumText', {
    podium_text_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    podium_text: {
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
    },
    podium_category_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'podium_categories',
        key: 'podium_category_id'
      }
    }
  }, {
    tableName: 'podium_texts',
    timestamps: false
  });

  PodiumText.associate = (models) => {
    PodiumText.belongsTo(models.PodiumCategory, {
      foreignKey: 'podium_category_id',
      as: 'category'
    });
  };

  return PodiumText;
};
