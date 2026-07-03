const express = require('express');
const router = express.Router();
const { SystemLog, User } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');

router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, user_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (action) where.action = { [require('sequelize').Op.iLike]: `%${action}%` };
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;

    const { count, rows } = await SystemLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      logs: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
