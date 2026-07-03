const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const GuestBooking = sequelize.define('GuestBooking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dni: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: DataTypes.STRING
}, {
  tableName: 'guest_bookings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = GuestBooking;
