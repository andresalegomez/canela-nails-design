const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const sequelize = require('../database/config');
const { QueryTypes } = require('sequelize');
const { formatTime } = require('../utils/validators');

const TABLE_MAP = {
  users: { pk: 'id', label: 'Usuarios' },
  services: { pk: 'id', label: 'Servicios' },
  employee_services: { pk: 'id', label: 'Servicios de Empleados' },
  employee_schedules: { pk: 'id', label: 'Horarios' },
  employee_breaks: { pk: 'id', label: 'Descansos' },
  appointments: { pk: 'id', label: 'Turnos' },
  guest_bookings: { pk: 'id', label: 'Reservas Invitados' },
  payments: { pk: 'id', label: 'Pagos' },
  cash_register: { pk: 'id', label: 'Caja' },
  cash_movements: { pk: 'id', label: 'Movimientos de Caja' },
  liquidations: { pk: 'id', label: 'Liquidaciones' },
  liquidation_items: { pk: 'id', label: 'Items de Liquidación' },
  virtual_surcharge_config: { pk: 'id', label: 'Configuración de Recargo' },
  notifications: { pk: 'id', label: 'Notificaciones' },
  system_logs: { pk: 'id', label: 'Logs del Sistema' }
};

router.get('/tables', auth, requireAdmin, async (req, res) => {
  try {
    const tables = Object.entries(TABLE_MAP).map(([name, info]) => ({
      name,
      label: info.label
    }));
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/tables/:name', auth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    if (!TABLE_MAP[name]) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const { page = 1, limit = 50, search = '', sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const replacements = {};

    if (search) {
      const columns = await sequelize.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = '${name}' AND data_type IN ('character varying', 'text', 'uuid')`,
        { type: QueryTypes.SELECT }
      );

      if (columns.length > 0) {
        const conditions = columns.map((col, i) => `"${col.column_name}"::text ILIKE :search${i}`);
        columns.forEach((_, i) => { replacements[`search${i}`] = `%${search}%`; });
        whereClause = `WHERE ${conditions.join(' OR ')}`;
      }
    }

    const countResult = await sequelize.query(
      `SELECT COUNT(*) as total FROM "${name}" ${whereClause}`,
      { replacements, type: QueryTypes.SELECT }
    );

    const total = parseInt(countResult[0].total);

    const data = await sequelize.query(
      `SELECT * FROM "${name}" ${whereClause} ORDER BY "${sort}" ${order === 'DESC' ? 'DESC' : 'ASC'} LIMIT :limit OFFSET :offset`,
      { replacements: { ...replacements, limit: parseInt(limit), offset: parseInt(offset) }, type: QueryTypes.SELECT }
    );

    const formattedData = data.map(row => {
      const formatted = { ...row };
      if (formatted.start_time) formatted.start_time = formatTime(formatted.start_time);
      if (formatted.end_time) formatted.end_time = formatTime(formatted.end_time);
      if (formatted.appointment_time) formatted.appointment_time = formatTime(formatted.appointment_time);
      return formatted;
    });

    res.json({
      data: formattedData,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      columns: data.length > 0 ? Object.keys(data[0]) : []
    });
  } catch (error) {
    console.error('Get table data error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/tables/:name/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, id } = req.params;
    if (!TABLE_MAP[name]) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const pk = TABLE_MAP[name].pk;
    const result = await sequelize.query(
      `SELECT * FROM "${name}" WHERE "${pk}" = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    const formatted = { ...result[0] };
    if (formatted.start_time) formatted.start_time = formatTime(formatted.start_time);
    if (formatted.end_time) formatted.end_time = formatTime(formatted.end_time);

    res.json({ data: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/tables/:name/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, id } = req.params;
    if (!TABLE_MAP[name]) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const pk = TABLE_MAP[name].pk;
    const updates = req.body;

    const setClauses = [];
    const replacements = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key === pk) return;
      setClauses.push(`"${key}" = :${key}`);
      replacements[key] = value;
    });

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    replacements.id = id;

    const tableInfo = await sequelize.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${name}' AND column_name = 'updated_at'`,
      { type: QueryTypes.SELECT }
    );

    if (tableInfo.length > 0) {
      setClauses.push(`"updated_at" = NOW()`);
    }

    await sequelize.query(
      `UPDATE "${name}" SET ${setClauses.join(', ')} WHERE "${pk}" = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );

    const result = await sequelize.query(
      `SELECT * FROM "${name}" WHERE "${pk}" = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );

    res.json({ data: result[0] });
  } catch (error) {
    console.error('Update row error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/tables/:name', auth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;
    if (!TABLE_MAP[name]) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const data = req.body;
    const columns = Object.keys(data);
    const values = Object.values(data);

    const colNames = columns.map(c => `"${c}"`).join(', ');
    const valPlaceholders = columns.map(c => `:${c}`).join(', ');

    const replacements = {};
    columns.forEach((col, i) => { replacements[col] = values[i]; });

    const result = await sequelize.query(
      `INSERT INTO "${name}" (${colNames}) VALUES (${valPlaceholders}) RETURNING *`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.status(201).json({ data: result[0] });
  } catch (error) {
    console.error('Create row error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.delete('/tables/:name/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, id } = req.params;
    if (!TABLE_MAP[name]) {
      return res.status(404).json({ error: 'Tabla no encontrada' });
    }

    const pk = TABLE_MAP[name].pk;

    await sequelize.query(
      `DELETE FROM "${name}" WHERE "${pk}" = :id`,
      { replacements: { id }, type: QueryTypes.DELETE }
    );

    res.json({ message: 'Registro eliminado' });
  } catch (error) {
    console.error('Delete row error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
