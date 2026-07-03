const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const CashRegister = sequelize.define('CashRegister', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  }
}, {
  tableName: 'cash_register',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

module.exports = CashRegister;
