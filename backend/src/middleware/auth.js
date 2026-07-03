const jwt = require('jsonwebtoken');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Se requieren permisos de administrador' });
  }
  next();
};

const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Se requieren permisos de empleado' });
  }
  next();
};

const requireClient = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'client' && req.user.role !== 'employee') {
    return res.status(403).json({ error: 'Se requieren permisos de cliente' });
  }
  next();
};

module.exports = { auth, requireAdmin, requireEmployee, requireClient };
