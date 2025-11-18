module.exports = (sequelize, DataTypes) => {
  const SchoolPayment = sequelize.define('SchoolPayment', {
    payment_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    school_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'school_id'
      }
    },
    order_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: { msg: 'Order ID already exists' }
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    gross_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'Amount must be positive' }
      }
    },
    payment_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    transaction_status: {
      type: DataTypes.ENUM('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fraud_status: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    payment_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    invoice_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON data for invoice details'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'school_payments',
    timestamps: false
  });

  SchoolPayment.associate = (models) => {
    SchoolPayment.belongsTo(models.School, {
      foreignKey: 'school_id',
      as: 'school'
    });
  };

  return SchoolPayment;
};
