module.exports = (sequelize, DataTypes) => {
  const GayaPenyampaian = sequelize.define('GayaPenyampaian', {
    gaya_penyampaian_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    gaya_penyampaian: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Gaya penyampaian is required' }
      }
    }
  }, {
    tableName: 'gaya_penyampaian',
    timestamps: false
  });

  GayaPenyampaian.associate = (models) => {
    GayaPenyampaian.belongsToMany(models.ContentSwara, {
      through: 'gaya_penyampaian_contents',
      foreignKey: 'gaya_penyampaian_id',
      otherKey: 'content_swara_id',
      as: 'contents'
    });
  };

  return GayaPenyampaian;
};
