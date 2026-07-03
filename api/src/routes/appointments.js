const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Appointment, User, Service, GuestBooking, EmployeeService, Notification, Payment } = require('../models');
const { auth, requireAdmin, requireEmployee, requireClient } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { formatTime } = require('../utils/validators');
const sequelize = require('../database/config');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, date, status, employee_id, client_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (date) where.date = date;
    if (status) where.status = status;
    if (employee_id) where.employee_id = employee_id;

    if (req.user.role === 'client') {
      where.client_id = req.user.id;
    } else if (client_id) {
      where.client_id = client_id;
    }

    const { count, rows } = await Appointment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'dni'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const appointments = rows.map(apt => {
      const obj = apt.toJSON();
      obj.start_time = formatTime(apt.start_time);
      obj.end_time = formatTime(apt.end_time);
      return obj;
    });

    res.json({ appointments, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const where = {};

    if (req.user.role === 'client') {
      where.client_id = req.user.id;
    } else if (req.user.role === 'employee') {
      where.employee_id = req.user.id;
    }

    where.status = { [Op.ne]: 'cancelado' };

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    const formatted = appointments.map(apt => {
      const obj = apt.toJSON();
      obj.start_time = formatTime(apt.start_time);
      obj.end_time = formatTime(apt.end_time);
      return obj;
    });

    res.json({ appointments: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'dni'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes', 'price'] },
        { model: GuestBooking, as: 'guestBooking' },
        { model: Payment, as: 'payments', where: { is_reversed: false }, required: false }
      ]
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const obj = appointment.toJSON();
    obj.start_time = formatTime(appointment.start_time);
    obj.end_time = formatTime(appointment.end_time);

    res.json({ appointment: obj });
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { employee_id, service_id, date, start_time, notes, guest, client_id } = req.body;

    if (!employee_id || !service_id || !date || !start_time) {
      await transaction.rollback();
      return res.status(400).json({ error: 'employee_id, service_id, date y start_time son requeridos' });
    }

    const service = await Service.findByPk(service_id, { transaction });
    if (!service) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const employee = await User.findByPk(employee_id, { transaction });
    if (!employee || employee.role !== 'employee') {
      await transaction.rollback();
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    let clientId = req.user.role === 'client' ? req.user.id : (client_id || null);

    if (clientId) {
      const client = await User.findByPk(clientId, { transaction });
      if (client) {
        if (client.blocked) {
          await transaction.rollback();
          return res.status(403).json({ error: 'Tu cuenta ha sido bloqueada. No puedes realizar reservas.' });
        }
        if (client.email) {
          const blockedByEmail = await User.findOne({ where: { email: client.email, blocked_email: true, id: { [Op.ne]: clientId } }, transaction });
          if (blockedByEmail) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Este email ha sido bloqueado. No se permiten reservas con este email.' });
          }
        }
        if (client.dni) {
          const blockedByDni = await User.findOne({ where: { dni: client.dni, blocked_dni: true, id: { [Op.ne]: clientId } }, transaction });
          if (blockedByDni) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Este DNI ha sido bloqueado. No se permiten reservas con este DNI.' });
          }
        }
        if (client.phone) {
          const blockedByPhone = await User.findOne({ where: { phone: client.phone, blocked_phone: true, id: { [Op.ne]: clientId } }, transaction });
          if (blockedByPhone) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Este teléfono ha sido bloqueado. No se permiten reservas con este teléfono.' });
          }
        }
      }
    }

    if (guest && !clientId) {
      if (guest.email) {
        const blockedGuestEmail = await User.findOne({ where: { email: guest.email, blocked_email: true }, transaction });
        if (blockedGuestEmail) {
          await transaction.rollback();
          return res.status(403).json({ error: 'Este email ha sido bloqueado. No se permiten reservas con este email.' });
        }
      }
      if (guest.dni) {
        const blockedGuestDni = await User.findOne({ where: { dni: guest.dni, blocked_dni: true }, transaction });
        if (blockedGuestDni) {
          await transaction.rollback();
          return res.status(403).json({ error: 'Este DNI ha sido bloqueado. No se permiten reservas con este DNI.' });
        }
      }
      if (guest.phone) {
        const blockedGuestPhone = await User.findOne({ where: { phone: guest.phone, blocked_phone: true }, transaction });
        if (blockedGuestPhone) {
          await transaction.rollback();
          return res.status(403).json({ error: 'Este teléfono ha sido bloqueado. No se permiten reservas con este teléfono.' });
        }
      }
    }

    const empService = await EmployeeService.findOne({
      where: { employee_id, service_id, is_active: true },
      transaction
    });

    const basePrice = empService?.custom_price || service.price;

    const startMinutes = timeToMinutes(start_time);
    const endMinutes = startMinutes + service.duration_minutes;
    const end_time = minutesToTime(endMinutes);

    const conflict = await Appointment.findOne({
      where: {
        employee_id,
        date,
        status: { [Op.in]: ['solicitado', 'agendado'] },
        [Op.and]: [
          { start_time: { [Op.lt]: end_time } },
          { end_time: { [Op.gt]: start_time } }
        ]
      },
      transaction
    });

    if (conflict) {
      await transaction.rollback();
      return res.status(400).json({ error: 'El empleado ya tiene un turno en ese horario' });
    }

    const appointment = await Appointment.create({
      client_id: clientId,
      employee_id,
      service_id,
      date,
      start_time,
      end_time,
      base_price: basePrice,
      total_price: basePrice,
      notes,
      status: 'solicitado'
    }, { transaction });

    if (guest && !clientId) {
      await GuestBooking.create({
        appointment_id: appointment.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        dni: guest.dni,
        email: guest.email,
        phone: guest.phone
      }, { transaction });
    }

    await Notification.create({
      user_id: employee_id,
      type: 'new_appointment',
      title: 'Nuevo Turno',
      message: `Nuevo turno #${appointment.appointment_number} para el ${date} a las ${formatTime(start_time)}`,
      data: { appointment_id: appointment.id, appointment_number: appointment.appointment_number }
    }, { transaction });

    if (clientId) {
      await Notification.create({
        user_id: clientId,
        type: 'appointment_created',
        title: 'Turno Creado',
        message: `Tu turno #${appointment.appointment_number} ha sido creado para el ${date} a las ${formatTime(start_time)}`,
        data: { appointment_id: appointment.id, appointment_number: appointment.appointment_number }
      }, { transaction });
    }

    await transaction.commit();

    logAction(req.user.id, 'create_appointment', 'appointment', appointment.id, { appointment_number: appointment.appointment_number, date, start_time });

    const full = await Appointment.findByPk(appointment.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service' },
        { model: GuestBooking, as: 'guestBooking' }
      ]
    });

    res.status(201).json({ appointment: { ...full.toJSON(), start_time: formatTime(full.start_time), end_time: formatTime(full.end_time) } });
  } catch (error) {
    await transaction.rollback();
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const appointment = await Appointment.findByPk(req.params.id, { transaction });
    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (req.user.role === 'client' && appointment.client_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No autorizado' });
    }

    const { employee_id, service_id, date, start_time, notes, status } = req.body;

    if (status) {
      appointment.status = status;
    }

    if (service_id) {
      const service = await Service.findByPk(service_id, { transaction });
      if (service) {
        appointment.service_id = service_id;
        appointment.base_price = service.price;
        appointment.total_price = service.price;
      }
    }

    if (date) appointment.date = date;
    if (start_time) {
      appointment.start_time = start_time;
      const svc = await Service.findByPk(appointment.service_id, { transaction });
      const endMinutes = timeToMinutes(start_time) + (svc?.duration_minutes || 30);
      appointment.end_time = minutesToTime(endMinutes);
    }
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save({ transaction });
    await transaction.commit();

    const full = await Appointment.findByPk(appointment.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service' }
      ]
    });

    res.json({ appointment: { ...full.toJSON(), start_time: formatTime(full.start_time), end_time: formatTime(full.end_time) } });
  } catch (error) {
    await transaction.rollback();
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['name'] }
      ],
      transaction
    });

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    if (['cancelado', 'liquidado', 'completado'].includes(appointment.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede cancelar este turno' });
    }

    const { cancellation_reason } = req.body;

    if (req.user.role === 'client') {
      const appointmentDate = new Date(appointment.date + 'T' + appointment.start_time);
      const now = new Date();
      const hoursUntil = (appointmentDate - now) / (1000 * 60 * 60);

      if (hoursUntil < 24) {
        await appointment.update({
          cancellation_reason: cancellation_reason || 'Solicitud de cancelación por cliente (menos de 24h)',
          cancelled_by: req.user.id,
          cancelled_at: new Date()
        }, { transaction });

        const admins = await User.findAll({ where: { role: 'admin' }, transaction });
        for (const admin of admins) {
          await Notification.create({
            user_id: admin.id,
            type: 'cancellation_request',
            title: 'Solicitud de Cancelación',
            message: `El cliente ${appointment.client?.first_name} solicita cancelar turno #${appointment.appointment_number} (menos de 24h antes)`,
            data: { appointment_id: appointment.id, appointment_number: appointment.appointment_number }
          }, { transaction });
        }

        await transaction.commit();

        logAction(req.user.id, 'request_cancellation', 'appointment', appointment.id, { appointment_number: appointment.appointment_number, reason: cancellation_reason });

        return res.json({ message: 'Solicitud de cancelación enviada. Un administrador debe aprobarla.', appointment });
      }
    }

    await appointment.update({
      status: 'cancelado',
      cancellation_reason: cancellation_reason,
      cancelled_by: req.user.id,
      cancelled_at: new Date()
    }, { transaction });

    if (appointment.client_id) {
      await Notification.create({
        user_id: appointment.client_id,
        type: 'appointment_cancelled',
        title: 'Turno Cancelado',
        message: `Tu turno #${appointment.appointment_number} ha sido cancelado`,
        data: { appointment_id: appointment.id }
      }, { transaction });
    }

    await Notification.create({
      user_id: appointment.employee_id,
      type: 'appointment_cancelled',
      title: 'Turno Cancelado',
      message: `El turno #${appointment.appointment_number} ha sido cancelado`,
      data: { appointment_id: appointment.id }
    }, { transaction });

    await transaction.commit();

    logAction(req.user.id, 'cancel_appointment', 'appointment', appointment.id, { appointment_number: appointment.appointment_number, reason: cancellation_reason });

    res.json({ message: 'Turno cancelado', appointment });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByPk(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }

    const previousStatus = appointment.status;

    const validTransitions = {
      'solicitado': ['agendado', 'cancelado'],
      'agendado': ['completado', 'cancelado'],
      'completado': ['liquidado'],
      'cancelado': [],
      'liquidado': []
    };

    if (!validTransitions[appointment.status]?.includes(status)) {
      return res.status(400).json({ error: `Transición de ${appointment.status} a ${status} no permitida` });
    }

    await appointment.update({ status });

    logAction(req.user.id, 'change_status', 'appointment', appointment.id, { appointment_number: appointment.appointment_number, from: previousStatus, to: status });

    res.json({ message: 'Estado actualizado', appointment });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/employee/:employeeId/pending', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const where = {
      employee_id: req.params.employeeId,
      status: { [Op.in]: ['solicitado', 'agendado'] }
    };
    if (date) where.date = date;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
        { model: Service, as: 'service', attributes: ['id', 'name', 'duration_minutes'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    res.json({ appointments: appointments.map(a => ({ ...a.toJSON(), start_time: formatTime(a.start_time), end_time: formatTime(a.end_time) })) });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

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

module.exports = router;
