const sequelize = require('../database/config');
const User = require('./User');
const Service = require('./Service');
const EmployeeService = require('./EmployeeService');
const EmployeeSchedule = require('./EmployeeSchedule');
const EmployeeBreak = require('./EmployeeBreak');
const Appointment = require('./Appointment');
const GuestBooking = require('./GuestBooking');
const Payment = require('./Payment');
const CashRegister = require('./CashRegister');
const CashMovement = require('./CashMovement');
const Liquidation = require('./Liquidation');
const LiquidationItem = require('./LiquidationItem');
const VirtualSurchargeConfig = require('./VirtualSurchargeConfig');
const Notification = require('./Notification');
const SystemLog = require('./SystemLog');

User.hasMany(EmployeeService, { foreignKey: 'employee_id', as: 'employeeServices' });
EmployeeService.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

Service.hasMany(EmployeeService, { foreignKey: 'service_id', as: 'employeeServices' });
EmployeeService.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

User.hasMany(EmployeeSchedule, { foreignKey: 'employee_id', as: 'schedules' });
EmployeeSchedule.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

User.hasMany(EmployeeBreak, { foreignKey: 'employee_id', as: 'breaks' });
EmployeeBreak.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

User.hasMany(Appointment, { foreignKey: 'client_id', as: 'clientAppointments' });
Appointment.belongsTo(User, { foreignKey: 'client_id', as: 'client' });

User.hasMany(Appointment, { foreignKey: 'employee_id', as: 'employeeAppointments' });
Appointment.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

Service.hasMany(Appointment, { foreignKey: 'service_id', as: 'appointments' });
Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

Appointment.hasOne(GuestBooking, { foreignKey: 'appointment_id', as: 'guestBooking' });
GuestBooking.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

Appointment.hasMany(Payment, { foreignKey: 'appointment_id', as: 'payments' });
Payment.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

User.hasMany(Payment, { foreignKey: 'recorded_by', as: 'recordedPayments' });
Payment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });

User.hasMany(CashMovement, { foreignKey: 'performed_by', as: 'cashMovements' });
CashMovement.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

User.hasMany(Liquidation, { foreignKey: 'employee_id', as: 'employeeLiquidations' });
Liquidation.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

User.hasMany(Liquidation, { foreignKey: 'performed_by', as: 'performedLiquidations' });
Liquidation.belongsTo(User, { foreignKey: 'performed_by', as: 'performer' });

Liquidation.hasMany(LiquidationItem, { foreignKey: 'liquidation_id', as: 'items' });
LiquidationItem.belongsTo(Liquidation, { foreignKey: 'liquidation_id', as: 'liquidation' });

Appointment.hasMany(LiquidationItem, { foreignKey: 'appointment_id', as: 'liquidationItems' });
LiquidationItem.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(SystemLog, { foreignKey: 'user_id', as: 'logs' });
SystemLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Service,
  EmployeeService,
  EmployeeSchedule,
  EmployeeBreak,
  Appointment,
  GuestBooking,
  Payment,
  CashRegister,
  CashMovement,
  Liquidation,
  LiquidationItem,
  VirtualSurchargeConfig,
  Notification,
  SystemLog
};
