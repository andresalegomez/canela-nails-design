const express = require('express');
const router = express.Router();
const { Service, EmployeeService, User } = require('../models');
const { auth, requireAdmin, requireEmployee } = require('../middleware/auth');
const { validateDuration } = require('../utils/validators');
const { logAction } = require('../middleware/logger');
const { Op } = require('sequelize');

router.get('/', auth, async (req, res) => {
  try {
    const { search = '', is_active } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const services = await Service.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json({ service });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { name, description, duration_minutes, price } = req.body;

    if (!name || !duration_minutes || !price) {
      return res.status(400).json({ error: 'Nombre, duración y precio son requeridos' });
    }

    if (!validateDuration(duration_minutes)) {
      return res.status(400).json({ error: 'La duración debe ser múltiplo de 5 minutos' });
    }

    const service = await Service.create({
      name,
      description,
      duration_minutes,
      price
    });

    logAction(req.user.id, 'create_service', 'service', service.id, { name, duration_minutes, price });

    res.status(201).json({ service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    const { name, description, duration_minutes, price, is_active } = req.body;

    if (duration_minutes !== undefined && !validateDuration(duration_minutes)) {
      return res.status(400).json({ error: 'La duración debe ser múltiplo de 5 minutos' });
    }

    const previousData = { name: service.name, price: parseFloat(service.price), duration_minutes: service.duration_minutes };

    await service.update({ name, description, duration_minutes, price, is_active });

    logAction(req.user.id, 'update_service', 'service', service.id, { previous: previousData, current: { name, price, duration_minutes } });

    res.json({ service });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    await service.update({ is_active: false });

    logAction(req.user.id, 'deactivate_service', 'service', service.id, { name: service.name });

    res.json({ message: 'Servicio desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const employeeServices = await EmployeeService.findAll({
      where: { employee_id: req.params.employeeId, is_active: true },
      include: [{ model: Service, as: 'service' }]
    });

    res.json({ services: employeeServices });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/employee/assign', auth, requireAdmin, async (req, res) => {
  try {
    const { employee_id, service_id, custom_price, commission_percent } = req.body;

    if (!employee_id || !service_id) {
      return res.status(400).json({ error: 'employee_id y service_id son requeridos' });
    }

    const existing = await EmployeeService.findOne({
      where: { employee_id, service_id }
    });

    if (existing) {
      await existing.update({ custom_price, commission_percent, is_active: true });
      return res.json({ employee_service: existing });
    }

    const employeeService = await EmployeeService.create({
      employee_id,
      service_id,
      custom_price,
      commission_percent
    });

    res.status(201).json({ employee_service: employeeService });
  } catch (error) {
    console.error('Assign service error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/employee/:employeeId/:serviceId', auth, requireAdmin, async (req, res) => {
  try {
    const employeeService = await EmployeeService.findOne({
      where: { employee_id: req.params.employeeId, service_id: req.params.serviceId }
    });

    if (!employeeService) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    await employeeService.update({ is_active: false });
    res.json({ message: 'Servicio removido del empleado' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
