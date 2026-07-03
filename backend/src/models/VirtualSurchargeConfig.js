const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const VirtualSurchargeConfig = sequelize.define('VirtualSurchargeConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('percent', 'fixed'),
    allowNull: false
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'virtual_surcharge_config',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = VirtualSurchargeConfig;
