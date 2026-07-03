const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const SystemLog = sequelize.define('SystemLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: DataTypes.UUID,
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  entity_type: DataTypes.STRING,
  entity_id: DataTypes.UUID,
  details: DataTypes.JSONB,
  ip_address: DataTypes.STRING
}, {
  tableName: 'system_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = SystemLog;
