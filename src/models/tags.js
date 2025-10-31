module.exports = (sequelize, DataTypes) => {
  const Tag = sequelize.define('Tag', {
    tag_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    tag_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Tag name is required' }
      }
    }
  }, {
    tableName: 'tags',
    timestamps: false
  });

  Tag.associate = (models) => {
    Tag.belongsToMany(models.ContentSwara, {
      through: 'tag_contents',
      foreignKey: 'tag_id',
      otherKey: 'content_swara_id',
      as: 'contents'
    });
  };

  return Tag;
};
