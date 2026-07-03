const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Appointment } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '', is_approved } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { dni: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (role) where.role = role;
    if (is_approved !== undefined) where.is_approved = is_approved === 'true';

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { first_name, last_name, email, username, dni, phone, role, is_active, is_approved } = req.body;

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(400).json({ error: 'El email ya está en uso' });
    }
    if (username && username !== user.username) {
      const existing = await User.findOne({ where: { username, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(400).json({ error: 'El username ya está en uso' });
    }
    if (dni && dni !== user.dni) {
      const existing = await User.findOne({ where: { dni, id: { [Op.ne]: user.id } } });
      if (existing) return res.status(400).json({ error: 'El DNI ya está registrado' });
    }

    await user.update({
      first_name, last_name, email, username, dni, phone, role, is_active, is_approved
    });

    res.json({ user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'No se puede eliminar un administrador' });
    }

    await user.update({ is_active: false });
    res.json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/block', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ blocked: true });
    res.json({ message: 'Usuario bloqueado', user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/unblock', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ blocked: false });
    res.json({ message: 'Usuario desbloqueado', user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/toggle-can-charge', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role !== 'employee') {
      return res.status(400).json({ error: 'Solo se puede aplicar a empleados' });
    }

    await user.update({ can_charge_clients: !user.can_charge_clients });
    res.json({
      message: user.can_charge_clients ? 'Ahora puede cobrar clientes' : 'Ya no puede cobrar clientes',
      user: { ...user.toJSON(), password: undefined }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (req.user.role !== 'admin') {
      const validPassword = await bcrypt.compare(current_password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/employees', auth, requireAdmin, async (req, res) => {
  try {
    const { email, password, username, first_name, last_name, dni, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      first_name,
      last_name,
      dni,
      phone,
      role: 'employee',
      is_approved: false,
      is_active: true
    });

    res.status(201).json({ user: { ...user.toJSON(), password: undefined } });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/employees/all', auth, requireAdmin, async (req, res) => {
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

module.exports = router;
