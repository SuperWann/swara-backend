const bcrypt = require('bcrypt');

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
    User.hasMany(models.WatchHistory, {
      foreignKey: 'user_id',
      as: 'watchHistory'
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