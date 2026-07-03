const express = require('express');
const router = express.Router();
const { CashRegister, CashMovement, User } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { formatTime } = require('../utils/validators');

router.get('/balance', auth, requireAdmin, async (req, res) => {
  try {
    let cashRegister = await CashRegister.findOne();
    if (!cashRegister) {
      cashRegister = await CashRegister.create({ balance: 0 });
    }
    res.json({ balance: parseFloat(cashRegister.balance) });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/add', auth, requireAdmin, async (req, res) => {
  const transaction = await require('../database/config').transaction();
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    let cashRegister = await CashRegister.findOne({ transaction });
    if (!cashRegister) {
      cashRegister = await CashRegister.create({ balance: 0 }, { transaction });
    }
    await cashRegister.update({ balance: parseFloat(cashRegister.balance) + parseFloat(amount) }, { transaction });

    await CashMovement.create({
      type: 'ingreso',
      amount,
      description: description || 'Ingreso manual',
      reference_type: 'manual_add',
      cash_amount: amount,
      virtual_amount: 0,
      performed_by: req.user.id
    }, { transaction });

    await transaction.commit();

    logAction(req.user.id, 'manual_add_cash', 'cash_register', null, { amount, description });

    res.json({ balance: parseFloat(cashRegister.balance) });
  } catch (error) {
    await transaction.rollback();
    console.error('Add cash error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/withdraw', auth, requireAdmin, async (req, res) => {
  const transaction = await require('../database/config').transaction();
  try {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
    }

    let cashRegister = await CashRegister.findOne({ transaction });
    if (!cashRegister) {
      cashRegister = await CashRegister.create({ balance: 0 }, { transaction });
    }

    if (parseFloat(cashRegister.balance) < parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    await cashRegister.update({ balance: parseFloat(cashRegister.balance) - parseFloat(amount) }, { transaction });

    await CashMovement.create({
      type: 'egreso',
      amount,
      description: description || 'Retiro manual',
      reference_type: 'manual_withdraw',
      cash_amount: amount,
      virtual_amount: 0,
      performed_by: req.user.id
    }, { transaction });

    await transaction.commit();

    logAction(req.user.id, 'manual_withdraw_cash', 'cash_register', null, { amount, description });

    res.json({ balance: parseFloat(cashRegister.balance) });
  } catch (error) {
    await transaction.rollback();
    console.error('Withdraw cash error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/movements', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (type) where.type = type;
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[require('sequelize').Op.gte] = new Date(date_from);
      if (date_to) where.created_at[require('sequelize').Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const { count, rows } = await CashMovement.findAndCountAll({
      where,
      include: [{ model: User, as: 'performer', attributes: ['id', 'first_name', 'last_name'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      movements: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
