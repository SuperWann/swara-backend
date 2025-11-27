module.exports = (sequelize, DataTypes) => {
  const MatchResult = sequelize.define('MatchResult', {
    match_result_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    point_earned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Points cannot be negative' }
      }
    },
    match_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'matchs',
        key: 'match_id'
      }
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    tempo: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    artikulasi: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    kontak_mata: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    kesesuaian_topik: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    struktur: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    jeda: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    first_impression: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    ekspresi: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    gestur: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    kata_pengisi: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    kata_tidak_senonoh: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    result_ai: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: 'match_results',
    timestamps: false
  });

  MatchResult.associate = (models) => {
    MatchResult.belongsTo(models.Match, {
      foreignKey: 'match_id',
      as: 'match'
    });

    MatchResult.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return MatchResult;
};
