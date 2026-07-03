const express = require('express');
const router = express.Router();
const { User, EmployeeSchedule, EmployeeBreak, EmployeeService, Service, Appointment } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { formatTime, validateDayOfWeek } = require('../utils/validators');
const { logAction } = require('../middleware/logger');

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const employees = await User.findAll({
      where: { role: 'employee' },
      attributes: { exclude: ['password'] },
      order: [['first_name', 'ASC']]
    });
    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const schedules = await EmployeeSchedule.findAll({
      where: { employee_id: employee.id },
      order: [['day_of_week', 'ASC']]
    });

    const breaks = await EmployeeBreak.findAll({
      where: { employee_id: employee.id },
      order: [['day_of_week', 'ASC']]
    });

    const services = await EmployeeService.findAll({
      where: { employee_id: employee.id, is_active: true },
      include: [{ model: Service, as: 'service' }]
    });

    res.json({
      employee: {
        ...employee.toJSON(),
        schedules: schedules.map(s => ({
          ...s.toJSON(),
          start_time: formatTime(s.start_time),
          end_time: formatTime(s.end_time)
        })),
        breaks: breaks.map(b => ({
          ...b.toJSON(),
          start_time: formatTime(b.start_time),
          end_time: formatTime(b.end_time)
        })),
        services
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/schedules', auth, async (req, res) => {
  try {
    const schedules = await EmployeeSchedule.findAll({
      where: { employee_id: req.params.id },
      order: [['day_of_week', 'ASC']]
    });

    res.json({
      schedules: schedules.map(s => ({
        ...s.toJSON(),
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/schedules', auth, requireAdmin, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, is_available } = req.body;

    if (!validateDayOfWeek(day_of_week)) {
      return res.status(400).json({ error: 'Día de la semana inválido (0-6)' });
    }

    const existing = await EmployeeSchedule.findOne({
      where: { employee_id: req.params.id, day_of_week }
    });

    if (existing) {
      await existing.update({ start_time, end_time, is_available });
      logAction(req.user.id, 'update_schedule', 'employee_schedule', existing.id, { employee_id: req.params.id, day_of_week, start_time, end_time });
      return res.json({
        schedule: {
          ...existing.toJSON(),
          start_time: formatTime(existing.start_time),
          end_time: formatTime(existing.end_time)
        }
      });
    }

    const schedule = await EmployeeSchedule.create({
      employee_id: req.params.id,
      day_of_week,
      start_time,
      end_time,
      is_available
    });

    logAction(req.user.id, 'create_schedule', 'employee_schedule', schedule.id, { employee_id: req.params.id, day_of_week, start_time, end_time });

    res.status(201).json({
      schedule: {
        ...schedule.toJSON(),
        start_time: formatTime(schedule.start_time),
        end_time: formatTime(schedule.end_time)
      }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:employeeId/schedules/:scheduleId', auth, requireAdmin, async (req, res) => {
  try {
    const schedule = await EmployeeSchedule.findOne({
      where: { id: req.params.scheduleId, employee_id: req.params.employeeId }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    const { day_of_week, start_time, end_time, is_available } = req.body;
    await schedule.update({ day_of_week, start_time, end_time, is_available });

    logAction(req.user.id, 'update_schedule', 'employee_schedule', schedule.id, { employee_id: req.params.employeeId, day_of_week, start_time, end_time });

    res.json({
      schedule: {
        ...schedule.toJSON(),
        start_time: formatTime(schedule.start_time),
        end_time: formatTime(schedule.end_time)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:employeeId/schedules/:scheduleId', auth, requireAdmin, async (req, res) => {
  try {
    const schedule = await EmployeeSchedule.findOne({
      where: { id: req.params.scheduleId, employee_id: req.params.employeeId }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    await schedule.destroy();

    logAction(req.user.id, 'delete_schedule', 'employee_schedule', req.params.scheduleId, { employee_id: req.params.employeeId });

    res.json({ message: 'Horario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/breaks', auth, async (req, res) => {
  try {
    const breaks = await EmployeeBreak.findAll({
      where: { employee_id: req.params.id },
      order: [['day_of_week', 'ASC']]
    });

    res.json({
      breaks: breaks.map(b => ({
        ...b.toJSON(),
        start_time: formatTime(b.start_time),
        end_time: formatTime(b.end_time)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/breaks', auth, requireAdmin, async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, description } = req.body;

    if (!validateDayOfWeek(day_of_week)) {
      return res.status(400).json({ error: 'Día de la semana inválido' });
    }

    const breakRecord = await EmployeeBreak.create({
      employee_id: req.params.id,
      day_of_week,
      start_time,
      end_time,
      description
    });

    logAction(req.user.id, 'create_break', 'employee_break', breakRecord.id, { employee_id: req.params.id, day_of_week, start_time, end_time });

    res.status(201).json({
      break: {
        ...breakRecord.toJSON(),
        start_time: formatTime(breakRecord.start_time),
        end_time: formatTime(breakRecord.end_time)
      }
    });
  } catch (error) {
    console.error('Create break error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:employeeId/breaks/:breakId', auth, requireAdmin, async (req, res) => {
  try {
    const breakRecord = await EmployeeBreak.findOne({
      where: { id: req.params.breakId, employee_id: req.params.employeeId }
    });

    if (!breakRecord) {
      return res.status(404).json({ error: 'Descanso no encontrado' });
    }

    const { day_of_week, start_time, end_time, description } = req.body;
    await breakRecord.update({ day_of_week, start_time, end_time, description });

    logAction(req.user.id, 'update_break', 'employee_break', breakRecord.id, { employee_id: req.params.employeeId, day_of_week, start_time, end_time });

    res.json({
      break: {
        ...breakRecord.toJSON(),
        start_time: formatTime(breakRecord.start_time),
        end_time: formatTime(breakRecord.end_time)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:employeeId/breaks/:breakId', auth, requireAdmin, async (req, res) => {
  try {
    const breakRecord = await EmployeeBreak.findOne({
      where: { id: req.params.breakId, employee_id: req.params.employeeId }
    });

    if (!breakRecord) {
      return res.status(404).json({ error: 'Descanso no encontrado' });
    }

    await breakRecord.destroy();

    logAction(req.user.id, 'delete_break', 'employee_break', req.params.breakId, { employee_id: req.params.employeeId });

    res.json({ message: 'Descanso eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id/services', auth, async (req, res) => {
  try {
    const services = await EmployeeService.findAll({
      where: { employee_id: req.params.id, is_active: true },
      include: [{ model: Service, as: 'service' }]
    });

    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/services', auth, requireAdmin, async (req, res) => {
  try {
    const { service_id, custom_price, commission_percent } = req.body;

    const existing = await EmployeeService.findOne({
      where: { employee_id: req.params.id, service_id }
    });

    if (existing) {
      await existing.update({ custom_price, commission_percent, is_active: true });
      return res.json({ employee_service: existing });
    }

    const employeeService = await EmployeeService.create({
      employee_id: req.params.id,
      service_id,
      custom_price,
      commission_percent
    });

    res.status(201).json({ employee_service: employeeService });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:employeeId/services/:serviceId', auth, requireAdmin, async (req, res) => {
  try {
    const employeeService = await EmployeeService.findOne({
      where: { employee_id: req.params.employeeId, service_id: req.params.serviceId }
    });

    if (!employeeService) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    await employeeService.update({ is_active: false });
    res.json({ message: 'Servicio removido' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/availability/:employeeId', auth, async (req, res) => {
  try {
    const employee = await User.findByPk(req.params.employeeId);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const schedules = await EmployeeSchedule.findAll({
      where: { employee_id: employee.id, is_available: true }
    });

    res.json({
      employee_id: employee.id,
      schedules: schedules.map(s => ({
        day_of_week: s.day_of_week,
        start_time: formatTime(s.start_time),
        end_time: formatTime(s.end_time)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
