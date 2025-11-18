module.exports = (sequelize, DataTypes) => {
  const School = sequelize.define('School', {
    school_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    school_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'School name is required' }
      }
    },
    npsn: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: { msg: 'NPSN already exists' },
      validate: {
        notEmpty: { msg: 'NPSN is required' }
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Address is required' }
      }
    },
    school_status: {
      type: DataTypes.ENUM('negeri', 'swasta'),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'School status is required' }
      }
    },
    official_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: { msg: 'Email already exists' },
      validate: {
        isEmail: { msg: 'Invalid email format' },
        notEmpty: { msg: 'Email is required' }
      }
    },
    pic_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'PIC name is required' }
      }
    },
    pic_position: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'PIC position is required' }
      }
    },
    pic_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'PIC phone is required' },
        is: { args: /^[0-9+\-\s()]*$/, msg: 'Invalid phone number format' }
      }
    },
    package_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'school_packages',
        key: 'package_id'
      }
    },
    student_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Student count must be at least 1' }
      }
    },
    mentor_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Mentor count must be at least 1' }
      }
    },
    duration_months: {
      type: DataTypes.ENUM('1', '3', '6', '12'),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Duration is required' }
      }
    },
    access_token: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { msg: 'Token already exists' }
    },
    admin_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    subscription_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscription_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'schools',
    timestamps: false
  });

  School.associate = (models) => {
    School.belongsTo(models.SchoolPackage, {
      foreignKey: 'package_id',
      as: 'package'
    });
    School.belongsTo(models.User, {
      foreignKey: 'admin_user_id',
      as: 'adminUser'
    });
    School.hasMany(models.SchoolPayment, {
      foreignKey: 'school_id',
      as: 'payments'
    });
    School.hasMany(models.User, {
      foreignKey: 'school_id',
      as: 'students'
    });
  };

  return School;
};
