const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Payment, Appointment, User, Service, CashRegister, CashMovement, VirtualSurchargeConfig, Notification } = require('../models');
const { auth, requireAdmin, requireEmployee } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { formatTime } = require('../utils/validators');
const sequelize = require('../database/config');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, appointment_id, date, employee_id } = req.query;
    const offset = (page - 1) * limit;
    const where = { is_reversed: false };

    if (appointment_id) where.appointment_id = appointment_id;

    const include = [
      {
        model: Appointment,
        as: 'appointment',
        where: {},
        include: [
          { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
          { model: Service, as: 'service', attributes: ['id', 'name'] }
        ]
      }
    ];

    if (date) include[0].where.date = date;
    if (employee_id) include[0].where.employee_id = employee_id;

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      payments: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'email'] },
            { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
            { model: Service, as: 'service' }
          ]
        },
        { model: User, as: 'recorder', attributes: ['id', 'first_name', 'last_name'] }
      ]
    });

    if (!payment) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    res.json({ payment });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', auth, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (req.user.role === 'employee' && !req.user.can_charge_clients) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No tienes permiso para registrar pagos. Se requiere permiso de cobro a clientes.' });
    }

    const { appointment_id, amount, payment_method, virtual_amount, cash_amount, description, is_partial } = req.body;

    if (!appointment_id || !amount || !payment_method) {
      await transaction.rollback();
      return res.status(400).json({ error: 'appointment_id, amount y payment_method son requeridos' });
    }

    const appointment = await Appointment.findByPk(appointment_id, {
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

    if (['cancelado', 'liquidado'].includes(appointment.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No se puede pagar un turno cancelado o liquidado' });
    }

    const existingPayments = await Payment.findAll({
      where: { appointment_id, is_reversed: false },
      transaction
    });

    const totalPaid = existingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const remaining = parseFloat(appointment.total_price) - totalPaid;

    if (amount > remaining && !is_partial) {
      await transaction.rollback();
      return res.status(400).json({ error: `El monto excede el saldo pendiente ($${remaining})` });
    }

    let virtualSurchargePercent = 0;
    let virtualSurchargeAmount = 0;

    if (payment_method === 'virtual' || payment_method === 'mixto') {
      const config = await VirtualSurchargeConfig.findOne({ where: { is_active: true }, transaction });
      if (config) {
        virtualSurchargePercent = parseFloat(config.value);
        if (config.type === 'percent') {
          virtualSurchargeAmount = (virtual_amount || 0) * (virtualSurchargePercent / 100);
        } else {
          virtualSurchargeAmount = parseFloat(config.value);
        }
      }
    }

    const payment = await Payment.create({
      appointment_id,
      amount,
      payment_method,
      virtual_amount: virtual_amount || 0,
      cash_amount: cash_amount || 0,
      virtual_surcharge_percent: virtualSurchargePercent,
      virtual_surcharge_amount: virtualSurchargeAmount,
      is_partial: is_partial || false,
      description,
      recorded_by: req.user.id
    }, { transaction });

    const clientName = appointment.client ? `${appointment.client.first_name} ${appointment.client.last_name}` : 'Cliente';

    if (payment_method === 'efectivo') {
      const cashReg = await CashRegister.findOne({ transaction });
      if (cashReg) {
        await cashReg.update({ balance: parseFloat(cashReg.balance) + parseFloat(amount) }, { transaction });
      }

      await CashMovement.create({
        type: 'ingreso',
        amount: amount,
        description: `Pago turno #${appointment.appointment_number} - ${clientName}`,
        reference_type: 'payment',
        reference_id: payment.id,
        appointment_number: appointment.appointment_number,
        virtual_amount: 0,
        cash_amount: amount,
        performed_by: req.user.id
      }, { transaction });
    }

    if (payment_method === 'mixto') {
      const cashAmt = parseFloat(cash_amount || 0);
      const virtualAmt = parseFloat(virtual_amount || 0);

      const cashReg = await CashRegister.findOne({ transaction });
      if (cashReg) {
        await cashReg.update({ balance: parseFloat(cashReg.balance) + cashAmt }, { transaction });
      }

      await CashMovement.create({
        type: 'ingreso',
        amount: cashAmt,
        description: `Pago turno #${appointment.appointment_number} - $${amount} total ($${cashAmt} efectivo + $${virtualAmt} virtual)`,
        reference_type: 'payment',
        reference_id: payment.id,
        appointment_number: appointment.appointment_number,
        virtual_amount: virtualAmt,
        cash_amount: cashAmt,
        performed_by: req.user.id
      }, { transaction });
    }

    if (payment_method === 'virtual') {
      await CashMovement.create({
        type: 'ingreso',
        amount: 0,
        description: `Pago virtual turno #${appointment.appointment_number} - ${clientName} - $${amount} + $${virtualSurchargeAmount} recargo`,
        reference_type: 'payment',
        reference_id: payment.id,
        appointment_number: appointment.appointment_number,
        virtual_amount: amount,
        cash_amount: 0,
        performed_by: req.user.id
      }, { transaction });
    }

    const totalPaidAfter = totalPaid + parseFloat(amount);
    if (totalPaidAfter >= parseFloat(appointment.total_price)) {
      await appointment.update({ status: 'completado' }, { transaction });
    }

    await transaction.commit();

    logAction(req.user.id, 'create_payment', 'payment', payment.id, { appointment_number: appointment.appointment_number, amount, payment_method });

    res.status(201).json({ payment });
  } catch (error) {
    await transaction.rollback();
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/reverse', auth, requireAdmin, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        {
          model: Appointment,
          as: 'appointment',
          include: [
            { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
            { model: Service, as: 'service', attributes: ['name'] }
          ]
        }
      ],
      transaction
    });

    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    if (payment.is_reversed) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Este pago ya fue revertido' });
    }

    await payment.update({
      is_reversed: true,
      reversed_at: new Date(),
      reversed_by: req.user.id
    }, { transaction });

    if (payment.payment_method === 'efectivo' || payment.payment_method === 'mixto') {
      const cashToSubtract = payment.payment_method === 'mixto'
        ? parseFloat(payment.cash_amount)
        : parseFloat(payment.amount);

      const cashReg = await CashRegister.findOne({ transaction });
      if (cashReg) {
        await cashReg.update({ balance: parseFloat(cashReg.balance) - cashToSubtract }, { transaction });
      }

      const clientName = payment.appointment?.client
        ? `${payment.appointment.client.first_name} ${payment.appointment.client.last_name}`
        : 'Cliente';

      await CashMovement.create({
        type: 'egreso',
        amount: cashToSubtract,
        description: `Reversión pago turno #${payment.appointment?.appointment_number} - ${clientName}`,
        reference_type: 'payment_reversal',
        reference_id: payment.id,
        appointment_number: payment.appointment?.appointment_number,
        cash_amount: cashToSubtract,
        virtual_amount: 0,
        performed_by: req.user.id
      }, { transaction });
    }

    const remainingPayments = await Payment.findAll({
      where: {
        appointment_id: payment.appointment_id,
        is_reversed: false,
        id: { [Op.ne]: payment.id }
      },
      transaction
    });

    const totalPaid = remainingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    await payment.appointment.update({
      status: totalPaid > 0 ? 'agendado' : 'solicitado'
    }, { transaction });

    await transaction.commit();

    logAction(req.user.id, 'reverse_payment', 'payment', payment.id, { appointment_number: payment.appointment?.appointment_number, amount: payment.amount });

    res.json({ message: 'Pago revertido correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Reverse payment error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
