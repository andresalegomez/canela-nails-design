const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const EmployeeSchedule = sequelize.define('EmployeeSchedule', {
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
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'employee_schedules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EmployeeSchedule;
