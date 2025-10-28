module.exports = (sequelize, DataTypes) => {
  const TeknikPembuka = sequelize.define('TeknikPembuka', {
    teknik_pembuka_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    teknik_pembuka: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Teknik pembuka is required' }
      }
    }
  }, {
    tableName: 'teknik_pembuka',
    timestamps: false
  });

  TeknikPembuka.associate = (models) => {
    TeknikPembuka.belongsToMany(models.ContentSwara, {
      through: 'teknik_pembuka_contents',
      foreignKey: 'teknik_pembuka_id',
      otherKey: 'content_swara_id',
      as: 'contents'
    });
  };

  return TeknikPembuka;
};
