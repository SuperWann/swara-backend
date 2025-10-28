module.exports = (sequelize, DataTypes) => {
  const Struktur = sequelize.define('Struktur', {
    struktur_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    struktur: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Struktur is required' }
      }
    }
  }, {
    tableName: 'struktur',
    timestamps: false
  });

  Struktur.associate = (models) => {
    Struktur.belongsToMany(models.ContentSwara, {
      through: 'struktur_contents',
      foreignKey: 'struktur_id',
      otherKey: 'content_swara_id',
      as: 'contents'
    });
  };

  return Struktur;
};
