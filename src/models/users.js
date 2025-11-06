const bcrypt = require('bcrypt');
const { model } = require('../services/chatgptService');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Full name is required' },
        len: { args: [2, 255], msg: 'Full name must be between 2-255 characters' }
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: { msg: 'Email already exists' },
      validate: {
        isEmail: { msg: 'Invalid email format' },
        notEmpty: { msg: 'Email is required' }
      }
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Password is required' },
        len: { args: [6], msg: 'Password must be at least 6 characters' }
      }
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: { args: /^[0-9+\-\s()]*$/, msg: 'Invalid phone number format' }
      }
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: { msg: 'Invalid date format' }
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    gender_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'genders',
        key: 'gender_id'
      }
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'refresh_token' 
    },
    refreshTokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'refresh_token_expires_at'
    },
    status: {
      type: DataTypes.ENUM('aktif', 'nonaktif'),
      allowNull: false,
      defaultValue: 'aktif'
    }
  }, {
    tableName: 'users',
    timestamps: false,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });
    User.belongsTo(models.Gender, {
      foreignKey: 'gender_id',
      as: 'gender'
    });
    User.hasMany(models.Mentee, { foreignKey: 'user_id', as: 'mentee' });
    User.hasMany(models.WatchHistory, {
      foreignKey: 'user_id',
      as: 'watchHistory'
    });
    User.belongsToMany(models.Badge, { through: 'user_badges', foreignKey: 'user_id', otherKey: 'badge_id', as: 'badges' });
    User.hasMany(models.MatchResult, {
      foreignKey: 'user_id',
      as: 'matchResults'
    });
    User.hasMany(models.ProgressPodium, {
      foreignKey: 'user_id',
      as: 'progressPodium'
    });
    User.hasMany(models.PodiumSession, {
      foreignKey: 'user_id',
      as: 'podiumSession'
    });
    User.hasOne(models.MentorProfile, {
      foreignKey: 'user_id',
      as: 'mentorProfile'
    });
    User.hasMany(models.Mentoring, {
      foreignKey: 'mentor_user_id',
      as: 'mentoringSessions'
    });
    User.hasMany(models.Mentoring, {
      foreignKey: 'mentee_user_id',
      as: 'menteeSessions'
    });
    User.hasMany(models.MentoringPayment, {
      foreignKey: 'user_id',
      as: 'mentoringPayments'
    });
    User.hasMany(models.SkorSwara, {
      foreignKey: 'user_id',
      as: 'skorSwara'
    });
    User.hasMany(models.MentorActivity, {
      foreignKey: 'user_id',
      as: 'mentorActivities'
    });
  };

  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  User.prototype.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  return User;
};