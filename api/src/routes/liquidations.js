const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Liquidation, LiquidationItem, Appointment, User, Service, Payment, CashRegister, CashMovement, EmployeeService } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { formatTime } = require('../utils/validators');
const sequelize = require('../database/config');

router.get('/pending/:employeeId', auth, requireAdmin, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: {
        employee_id: req.params.employeeId,
        status: 'completado'
      },
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: Service, as: 'service', attributes: ['id', 'name'] },
        { model: Payment, as: 'payments', where: { is_reversed: false }, required: false }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    const pending = [];
    for (const apt of appointments) {
      const totalPaid = apt.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      if (totalPaid < parseFloat(apt.total_price)) {
        const empService = await EmployeeService.findOne({
          where: { employee_id: apt.employee_id, service_id: apt.service_id }
        });

        pending.push({
          ...apt.toJSON(),
          start_time: formatTime(apt.start_time),
          end_time: formatTime(apt.end_time),
          total_paid: totalPaid,
          remaining: parseFloat(apt.total_price) - totalPaid,
          commission_percent: empService?.commission_percent || 0,
          commission_amount: (parseFloat(apt.total_price) * (empService?.commission_percent || 0)) / 100
        });
      }
    }

    res.json({ pending });
  } catch (error) {
    console.error('Get pending liquidations error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/summary/:employeeId', auth, requireAdmin, async (req, res) => {
  try {
    const { appointment_ids } = req.query;
    const ids = appointment_ids ? appointment_ids.split(',') : [];

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un appointment_id' });
    }

    const employee = await User.findByPk(req.params.employeeId, {
      attributes: ['id', 'first_name', 'last_name']
    });

    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const summary = [];
    let totalAmount = 0;

    for (const aptId of ids) {
      const appointment = await Appointment.findByPk(aptId, {
        include: [
          { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
          { model: Service, as: 'service', attributes: ['name'] },
          { model: Payment, as: 'payments', where: { is_reversed: false }, required: false }
        ]
      });

      if (!appointment || appointment.employee_id !== req.params.employeeId) continue;
      if (appointment.status !== 'completado') continue;

      const totalPaid = appointment.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
      const remaining = parseFloat(appointment.total_price) - totalPaid;

      if (remaining <= 0) continue;

      const empService = await EmployeeService.findOne({
        where: { employee_id: req.params.employeeId, service_id: appointment.service_id }
      });

      const commissionPercent = empService?.commission_percent || 0;
      const commissionAmount = (parseFloat(appointment.total_price) * commissionPercent) / 100;

      totalAmount += remaining;

      summary.push({
        appointment_id: appointment.id,
        appointment_number: appointment.appointment_number,
        date: appointment.date,
        start_time: formatTime(appointment.start_time),
        client_name: appointment.client
          ? `${appointment.client.first_name} ${appointment.client.last_name}`
          : 'Cliente',
        service_name: appointment.service?.name,
        total_price: parseFloat(appointment.total_price),
        total_paid: totalPaid,
        amount_to_pay: remaining,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount
      });
    }

    res.json({
      employee: { id: employee.id, first_name: employee.first_name, last_name: employee.last_name },
      summary,
      total_amount: totalAmount,
      items_count: summary.length
    });
  } catch (error) {
    console.error('Get liquidation summary error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, employee_id, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (employee_id) where.employee_id = employee_id;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const { count, rows } = await Liquidation.findAndCountAll({
      where,
      include: [
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'performer', attributes: ['id', 'first_name', 'last_name'] },
        { model: LiquidationItem, as: 'items' }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      liquidations: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const liquidation = await Liquidation.findByPk(req.params.id, {
      include: [
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: User, as: 'performer', attributes: ['id', 'first_name', 'last_name'] },
        { model: LiquidationItem, as: 'items' }
      ]
    });

    if (!liquidation) {
      return res.status(404).json({ error: 'Liquidación no encontrada' });
    }

    res.json({ liquidation });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', auth, requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { employee_id, appointment_ids, payment_method, virtual_amount, cash_amount, description } = req.body;

    if (!employee_id || !appointment_ids?.length) {
      await transaction.rollback();
      return res.status(400).json({ error: 'employee_id y appointment_ids son requeridos' });
    }

    const employee = await User.findByPk(employee_id, { transaction });
    if (!employee) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    let totalAmount = 0;
    const items = [];

    for (const aptId of appointment_ids) {
      const appointment = await Appointment.findByPk(aptId, {
        include: [
          { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
          { model: Service, as: 'service', attributes: ['name'] }
        ],
        transaction
      });

      if (!appointment || appointment.employee_id !== employee_id) continue;
      if (appointment.status !== 'completado') continue;

      const empService = await EmployeeService.findOne({
        where: { employee_id, service_id: appointment.service_id },
        transaction
      });

      const commissionPercent = empService?.commission_percent || 0;
      const commissionAmount = (parseFloat(appointment.total_price) * commissionPercent) / 100;

      totalAmount += parseFloat(appointment.total_price);

      const clientName = appointment.client
        ? `${appointment.client.first_name} ${appointment.client.last_name}`
        : 'Cliente';

      items.push({
        appointment_id: appointment.id,
        service_name: appointment.service?.name,
        client_name: clientName,
        appointment_date: appointment.date,
        appointment_time: appointment.start_time,
        appointment_number: appointment.appointment_number,
        base_price: appointment.total_price,
        commission_percent: commissionPercent,
        commission_amount: commissionAmount
      });

      await appointment.update({ status: 'liquidado' }, { transaction });
    }

    if (items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No hay turnos completados para liquidar' });
    }

    const liquidation = await Liquidation.create({
      employee_id,
      total_amount: totalAmount,
      payment_method: payment_method || 'efectivo',
      virtual_amount: virtual_amount || 0,
      cash_amount: cash_amount || 0,
      description,
      performed_by: req.user.id
    }, { transaction });

    for (const item of items) {
      await LiquidationItem.create({
        liquidation_id: liquidation.id,
        ...item
      }, { transaction });
    }

    const cashAmt = payment_method === 'mixto' ? (cash_amount || 0) : (payment_method === 'efectivo' ? totalAmount : 0);
    const virtualAmt = payment_method === 'mixto' ? (virtual_amount || 0) : (payment_method === 'virtual' ? totalAmount : 0);

    if (cashAmt > 0) {
      const cashReg = await CashRegister.findOne({ transaction });
      if (cashReg) {
        await cashReg.update({ balance: parseFloat(cashReg.balance) - parseFloat(cashAmt) }, { transaction });
      }
    }

    let movDescription = `Liquidación ${employee.first_name} ${employee.last_name} - $${totalAmount}`;
    if (payment_method === 'mixto') {
      movDescription += ` ($${cashAmt} efectivo + $${virtualAmt} virtual)`;
    }

    await CashMovement.create({
      type: 'egreso',
      amount: cashAmt || 0,
      description: movDescription,
      reference_type: 'liquidation',
      reference_id: liquidation.id,
      virtual_amount: virtualAmt,
      cash_amount: cashAmt,
      performed_by: req.user.id
    }, { transaction });

    await transaction.commit();

    logAction(req.user.id, 'create_liquidation', 'liquidation', liquidation.id, { employee_id, total_amount: totalAmount, items_count: items.length });

    res.status(201).json({
      liquidation: {
        ...liquidation.toJSON(),
        items
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create liquidation error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
