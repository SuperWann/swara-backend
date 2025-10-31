module.exports = (sequelize, DataTypes) => {
  const Keyword = sequelize.define('Keyword', {
    keyword_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    keyword: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Keyword is required' }
      }
    }
  }, {
    tableName: 'keywords',
    timestamps: false
  });

  Keyword.associate = (models) => {
    Keyword.belongsToMany(models.AduSwaraTopic, {
      through: 'adu_swara_keywords',
      foreignKey: 'keyword_id',
      otherKey: 'adu_swara_topic_id',
      as: 'topics'
    });
  };

  return Keyword;
};
