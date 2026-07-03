const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const EmployeeBreak = sequelize.define('EmployeeBreak', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  day_of_week: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0, max: 6 }
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  description: DataTypes.STRING
}, {
  tableName: 'employee_breaks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EmployeeBreak;
