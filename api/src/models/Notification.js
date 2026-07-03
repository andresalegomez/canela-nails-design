const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: DataTypes.STRING,
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  data: DataTypes.JSONB
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Notification;
