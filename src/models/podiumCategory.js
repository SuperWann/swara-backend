module.exports = (sequelize, DataTypes) => {
  const PodiumCategory = sequelize.define('PodiumCategory', {
    podium_category_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    podium_category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category is required' }
      }
    },
    is_interview: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'podium_categories',
    timestamps: false
  });

  return PodiumCategory;
};