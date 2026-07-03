const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const Liquidation = sequelize.define('Liquidation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  total_amount: {
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
  description: DataTypes.TEXT,
  performed_by: DataTypes.UUID
}, {
  tableName: 'liquidations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Liquidation;
