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
    kelancaran_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Kelancaran point cannot be negative' },
        max: { args: [5], msg: 'Kelancaran point cannot exceed 5' }
      }
    },
    penggunaan_bahasa_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Penggunaan bahasa point cannot be negative' },
        max: { args: [5], msg: 'Penggunaan bahasa point cannot exceed 5' }
      }
    },
    ekspresi_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Ekspresi point cannot be negative' },
        max: { args: [5], msg: 'Ekspresi point cannot exceed 5' }
      }
    },
    struktur_kalimat_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Struktur kalimat point cannot be negative' },
        max: { args: [5], msg: 'Struktur kalimat point cannot exceed 5' }
      }
    },
    isi_point: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Isi point cannot be negative' },
        max: { args: [5], msg: 'Isi point cannot exceed 5' }
      }
    },
    kelancaran_suggest: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    penggunaan_bahasa_suggest: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    ekspresi_suggest: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    struktur_kalimat_suggest: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    isi_suggest: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
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
