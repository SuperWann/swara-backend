module.exports = (sequelize, DataTypes) => {
  const MetodeMentoring = sequelize.define('MetodeMentoring', {
    metode_mentoring_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    metode_mentoring: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Metode mentoring is required' }
      }
    },
  }, {
    tableName: 'metode_mentoring',
    timestamps: false
  });

  return MetodeMentoring;
};