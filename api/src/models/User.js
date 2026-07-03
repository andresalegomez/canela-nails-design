const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'employee', 'client'),
    defaultValue: 'client'
  },
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  dni: {
    type: DataTypes.STRING,
    unique: true
  },
  phone: DataTypes.STRING,
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  can_charge_clients: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  blocked_email: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  blocked_dni: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  blocked_phone: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;
