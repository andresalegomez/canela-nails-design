const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('efectivo', 'virtual', 'mixto'),
    allowNull: false
  },
  virtual_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  cash_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  virtual_surcharge_percent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  virtual_surcharge_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  is_partial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  description: DataTypes.TEXT,
  recorded_by: DataTypes.UUID,
  is_reversed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reversed_at: DataTypes.DATE,
  reversed_by: DataTypes.UUID
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
