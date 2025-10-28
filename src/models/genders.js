module.exports = (sequelize, DataTypes) => {
  const Gender = sequelize.define('Gender', {
    gender_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Gender is required' }
      }
    }
  }, {
    tableName: 'genders',
    timestamps: false
  });

  Gender.associate = (models) => {
    Gender.hasMany(models.User, {
      foreignKey: 'gender_id',
      as: 'users'
    });
  };

  return Gender;
};