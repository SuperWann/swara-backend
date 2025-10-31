module.exports = (sequelize, DataTypes) => {
  const CategoryContentSwara = sequelize.define('CategoryContentSwara', {
    category_content_swara_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Category name is required' }
      }
    }
  }, {
    tableName: 'category_content_swara',
    timestamps: false
  });

  CategoryContentSwara.associate = (models) => {
    CategoryContentSwara.hasMany(models.ContentSwara, {
      foreignKey: 'category_content_swara_id',
      as: 'contents'
    });
  };

  return CategoryContentSwara;
};
