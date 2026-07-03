const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const Appointment = sequelize.define('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_number: {
    type: DataTypes.INTEGER,
    autoIncrement: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  service_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('solicitado', 'agendado', 'completado', 'cancelado', 'liquidado'),
    defaultValue: 'solicitado'
  },
  base_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  cancellation_reason: DataTypes.TEXT,
  cancelled_by: DataTypes.UUID,
  cancelled_at: DataTypes.DATE,
  notes: DataTypes.TEXT
}, {
  tableName: 'appointments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Appointment;
