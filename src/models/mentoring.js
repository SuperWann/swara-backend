module.exports = (sequelize, DataTypes) => {
  const Mentoring = sequelize.define('Mentoring', {
    mentoring_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    jadwal: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    tujuan_mentoring: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    metode_mentoring_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: {
            model: 'metode_mentoring',
            key: 'metode_mentoring_id'
        }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    mentor_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    mentee_user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
  }, {
    tableName: 'mentorings',
    timestamps: false,
  });

  Mentoring.associate = (models) => {
    Mentoring.belongsTo(models.User, {
      foreignKey: 'mentor_user_id',
      as: 'mentor'
    });
    Mentoring.belongsTo(models.User, {
      foreignKey: 'mentee_user_id',
      as: 'mentee'
    });
    Mentoring.belongsTo(models.MetodeMentoring, {
      foreignKey: 'metode_mentoring_id',
      as: 'metodeMentoring'
    });
    Mentoring.hasOne(models.MentoringPayment, {
      foreignKey: 'mentoring_id',
      as: 'payment'
    });
  };

  return Mentoring;
};
