module.exports = (sequelize, DataTypes) => {
  const LevelContentSwara = sequelize.define('LevelContentSwara', {
    level_content_swara_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    level_name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Level name is required' }
      }
    }
  }, {
    tableName: 'level_content_swara',
    timestamps: false
  });

  LevelContentSwara.associate = (models) => {
    LevelContentSwara.hasMany(models.ContentSwara, {
      foreignKey: 'level_content_swara_id',
      as: 'contents'
    });
  };

  return LevelContentSwara;
};
