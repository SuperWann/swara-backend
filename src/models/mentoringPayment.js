module.exports = (sequelize, DataTypes) => {
  const MentoringPayment = sequelize.define('MentoringPayment', {
    payment_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    mentoring_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: {
        model: 'mentorings',
        key: 'mentoring_id'
      }
    },
    order_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: 'Order ID untuk Midtrans'
    },
    gross_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Total harga pembayaran'
    },
    payment_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Tipe pembayaran (gopay, bank_transfer, dll)'
    },
    transaction_status: {
      type: DataTypes.ENUM('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Status transaksi dari Midtrans'
    },
    transaction_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Transaction ID dari Midtrans'
    },
    fraud_status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Status fraud dari Midtrans'
    },
    payment_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL untuk melakukan pembayaran'
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Waktu pembayaran berhasil'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'mentoring_payments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  MentoringPayment.associate = (models) => {
    MentoringPayment.belongsTo(models.Mentoring, {
      foreignKey: 'mentoring_id',
      as: 'mentoring'
    });
  };

  return MentoringPayment;
};
