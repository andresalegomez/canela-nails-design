const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const LiquidationItem = sequelize.define('LiquidationItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  liquidation_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  service_name: DataTypes.STRING,
  client_name: DataTypes.STRING,
  appointment_date: DataTypes.DATEONLY,
  appointment_time: DataTypes.TIME,
  appointment_number: DataTypes.INTEGER,
  base_price: DataTypes.DECIMAL(10, 2),
  commission_percent: DataTypes.DECIMAL(5, 2),
  commission_amount: DataTypes.DECIMAL(10, 2)
}, {
  tableName: 'liquidation_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = LiquidationItem;
