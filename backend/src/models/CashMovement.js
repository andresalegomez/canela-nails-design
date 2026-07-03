const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const CashMovement = sequelize.define('CashMovement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('ingreso', 'egreso'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reference_type: DataTypes.STRING,
  reference_id: DataTypes.UUID,
  appointment_number: DataTypes.INTEGER,
  virtual_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  cash_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  performed_by: DataTypes.UUID
}, {
  tableName: 'cash_movements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = CashMovement;
