const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/', auth, async (req, res) => {
  try {
    const { since } = req.query;
    const where = { user_id: req.user.id };

    if (since) {
      where.id = { [Op.gt]: parseInt(since) };
    }

    const notifications = await Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await notification.update({ is_read: true });
    res.json({ message: 'Notificación marcada como leída' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/read-all', auth, async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
