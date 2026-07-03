const { DataTypes } = require('sequelize');
const sequelize = require('../database/config');

const EmployeeService = sequelize.define('EmployeeService', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  service_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  custom_price: DataTypes.DECIMAL(10, 2),
  commission_percent: DataTypes.DECIMAL(5, 2),
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'employee_services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'service_id']
    }
  ]
});

module.exports = EmployeeService;
