module.exports = (sequelize, DataTypes) => {
  const SchoolPackage = sequelize.define('SchoolPackage', {
    package_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    package_code: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: 'Package code is required' }
      }
    },
    package_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Package name is required' }
      }
    },
    min_students: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Minimum students must be at least 0' }
      }
    },
    max_students: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Maximum students must be at least 1' }
      }
    },
    max_mentors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: 'Maximum mentors must be at least 1' }
      }
    },
    price_per_month: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Price must be positive' }
      }
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of package features'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'school_packages',
    timestamps: false
  });

  SchoolPackage.associate = (models) => {
    SchoolPackage.hasMany(models.School, {
      foreignKey: 'package_id',
      as: 'schools'
    });
  };

  return SchoolPackage;
};
