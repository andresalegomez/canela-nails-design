const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Notification } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { logAction } = require('../middleware/logger');
const { formatTime } = require('../utils/validators');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'Tu cuenta ha sido bloqueada' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está desactivada' });
    }

    if (user.role === 'employee' && !user.is_approved) {
      return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logAction(user.id, 'login', 'user', user.id, { email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        dni: user.dni,
        phone: user.phone,
        is_approved: user.is_approved,
        can_charge_clients: user.can_charge_clients
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, username, first_name, last_name, dni, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ error: 'El nombre de usuario ya existe' });
      }
    }

    if (dni) {
      const existingDni = await User.findOne({ where: { dni } });
      if (existingDni) {
        return res.status(400).json({ error: 'El DNI ya está registrado' });
      }
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
      role: 'client',
      is_approved: true
    });

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    logAction(user.id, 'register', 'user', user.id, { email: user.email });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        dni: user.dni,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/logout', auth, (req, res) => {
  logAction(req.user.id, 'logout', 'user', req.user.id, null);
  res.clearCookie('token');
  res.json({ message: 'Sesión cerrada correctamente' });
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        dni: req.user.dni,
        phone: req.user.phone,
        is_approved: req.user.is_approved,
        can_charge_clients: req.user.can_charge_clients,
        is_active: req.user.is_active,
        blocked: req.user.blocked
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/approve/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ is_approved: true });

    await Notification.create({
      user_id: user.id,
      type: 'account_approved',
      title: 'Cuenta Aprobada',
      message: 'Tu cuenta ha sido aprobada por el administrador.',
      data: { user_id: user.id }
    });

    logAction(req.user.id, 'approve_user', 'user', user.id, { email: user.email });

    res.json({ message: 'Usuario aprobado correctamente' });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/reject/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await user.update({ is_active: false });

    await Notification.create({
      user_id: user.id,
      type: 'account_rejected',
      title: 'Cuenta Rechazada',
      message: 'Tu cuenta ha sido rechazada por el administrador.',
      data: { user_id: user.id }
    });

    logAction(req.user.id, 'reject_user', 'user', user.id, { email: user.email });

    res.json({ message: 'Usuario rechazado' });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
