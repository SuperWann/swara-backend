module.exports = (sequelize, DataTypes) => {
  const AduSwaraCategory = sequelize.define('AduSwaraCategory', {
    adu_swara_category_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    adu_swara_category: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category is required' }
      }
    }
  }, {
    tableName: 'adu_swara_categories',
    timestamps: false
  });

  AduSwaraCategory.associate = (models) => {
    AduSwaraCategory.hasMany(models.AduSwaraTopic, {
      foreignKey: 'adu_swara_category_id',
      as: 'topics'
    });
  };

  return AduSwaraCategory;
};
