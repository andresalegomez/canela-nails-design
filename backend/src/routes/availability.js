const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Service, EmployeeSchedule, EmployeeBreak, Appointment, EmployeeService } = require('../models');
const { auth } = require('../middleware/auth');
const { formatTime } = require('../utils/validators');

function timeToMinutes(time) {
  const str = String(time);
  const parts = str.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

router.get('/', auth, async (req, res) => {
  try {
    const { employee_id, service_id, date } = req.query;

    if (!employee_id || !service_id || !date) {
      return res.status(400).json({ error: 'employee_id, service_id y date son requeridos' });
    }

    const service = await Service.findByPk(service_id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const employee = await User.findByPk(employee_id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const isAdmin = req.user.role === 'admin';
    const appointmentDate = new Date(date + 'T12:00:00');
    const dayOfWeek = appointmentDate.getDay();

    let workStart = 0;
    let workEnd = 1440;
    let breaks = [];

    if (!isAdmin) {
      const schedule = await EmployeeSchedule.findOne({
        where: { employee_id, day_of_week: dayOfWeek, is_available: true }
      });

      if (!schedule) {
        return res.json({ available: false, slots: [], message: 'El empleado no trabaja este día' });
      }

      workStart = timeToMinutes(schedule.start_time);
      workEnd = timeToMinutes(schedule.end_time);

      breaks = await EmployeeBreak.findAll({
        where: { employee_id, day_of_week: dayOfWeek }
      });
    }

    const existingAppointments = await Appointment.findAll({
      where: {
        employee_id,
        date,
        status: { [Op.in]: ['solicitado', 'agendado'] }
      }
    });

    const duration = service.duration_minutes;
    const slots = [];

    for (let time = workStart; time + duration <= workEnd; time += 5) {
      const slotStart = time;
      const slotEnd = time + duration;

      let available = true;

      for (const brk of breaks) {
        const breakStart = timeToMinutes(brk.start_time);
        const breakEnd = timeToMinutes(brk.end_time);

        if (slotStart < breakEnd && slotEnd > breakStart) {
          available = false;
          break;
        }
      }

      if (available) {
        for (const apt of existingAppointments) {
          const aptStart = timeToMinutes(apt.start_time);
          const aptEnd = timeToMinutes(apt.end_time);

          if (slotStart < aptEnd && slotEnd > aptStart) {
            available = false;
            break;
          }
        }
      }

      if (available) {
        slots.push({
          start_time: minutesToTime(slotStart),
          end_time: minutesToTime(slotEnd)
        });
      }
    }

    res.json({
      available: slots.length > 0,
      slots,
      employee_id,
      service: {
        id: service.id,
        name: service.name,
        duration_minutes: service.duration_minutes
      },
      date,
      day_of_week: dayOfWeek
    });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/employees', auth, async (req, res) => {
  try {
    const { service_id, date } = req.query;

    if (!service_id || !date) {
      return res.status(400).json({ error: 'service_id y date son requeridos' });
    }

    const appointmentDate = new Date(date + 'T12:00:00');
    const dayOfWeek = appointmentDate.getDay();

    const availableEmployees = await User.findAll({
      where: { role: 'employee', is_active: true, is_approved: true },
      include: [
        {
          model: EmployeeSchedule,
          as: 'schedules',
          where: { day_of_week: dayOfWeek, is_available: true },
          required: true
        },
        {
          model: EmployeeService,
          as: 'employeeServices',
          where: { service_id, is_active: true },
          required: true
        }
      ],
      attributes: { exclude: ['password'] }
    });

    res.json({ employees: availableEmployees });
  } catch (error) {
    console.error('Available employees error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
