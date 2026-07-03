const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Appointment, User, Service, Payment, CashMovement, Liquidation, LiquidationItem } = require('../models');
const { auth, requireAdmin } = require('../middleware/auth');
const { generateAppointmentReport, generateEmployeeReport, generateCashReport } = require('../utils/excel');
const { formatTime } = require('../utils/validators');

router.get('/appointments', auth, requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to, employee_id, status } = req.query;
    const where = {};

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }
    if (employee_id) where.employee_id = employee_id;
    if (status) where.status = status;

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name', 'dni'] },
        { model: User, as: 'employee', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['id', 'name'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    const data = appointments.map(apt => ({
      date: apt.date,
      appointment_number: apt.appointment_number,
      client_name: apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'Cliente invitado',
      dni: apt.client?.dni || 'N/A',
      service_name: apt.service?.name,
      employee_name: `${apt.employee?.first_name} ${apt.employee?.last_name}`,
      time: formatTime(apt.start_time),
      amount: parseFloat(apt.total_price),
      status: apt.status
    }));

    const workbook = await generateAppointmentReport(data, 'Reporte de Turnos');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_turnos.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

router.get('/employee/:employeeId', auth, requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const where = {
      employee_id: req.params.employeeId,
      status: { [Op.in]: ['completado', 'liquidado'] }
    };

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const employee = await User.findByPk(req.params.employeeId, {
      attributes: ['id', 'first_name', 'last_name']
    });

    const appointments = await Appointment.findAll({
      where,
      include: [
        { model: User, as: 'client', attributes: ['id', 'first_name', 'last_name'] },
        { model: Service, as: 'service', attributes: ['id', 'name'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    const { EmployeeService } = require('../models');

    const data = [];
    for (const apt of appointments) {
      const empService = await EmployeeService.findOne({
        where: { employee_id: apt.employee_id, service_id: apt.service_id }
      });

      data.push({
        date: apt.date,
        appointment_number: apt.appointment_number,
        client_name: apt.client ? `${apt.client.first_name} ${apt.client.last_name}` : 'N/A',
        service_name: apt.service?.name,
        amount: parseFloat(apt.total_price),
        commission_percent: empService?.commission_percent || 0,
        commission_amount: (parseFloat(apt.total_price) * (empService?.commission_percent || 0)) / 100
      });
    }

    const workbook = await generateEmployeeReport(data, `${employee?.first_name} ${employee?.last_name}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_${employee?.first_name}_${employee?.last_name}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Employee report error:', error);
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

router.get('/cash', auth, requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const where = {};

    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) where.created_at[Op.gte] = new Date(date_from);
      if (date_to) where.created_at[Op.lte] = new Date(date_to + 'T23:59:59');
    }

    const movements = await CashMovement.findAll({
      where,
      order: [['created_at', 'ASC']]
    });

    const data = movements.map(m => ({
      created_at: m.created_at,
      type: m.type,
      description: m.description,
      cash_amount: parseFloat(m.cash_amount || 0),
      virtual_amount: parseFloat(m.virtual_amount || 0),
      amount: parseFloat(m.amount)
    }));

    const workbook = await generateCashReport(data);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_caja.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Cash report error:', error);
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

router.get('/summary', auth, requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const where = {};

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date[Op.gte] = date_from;
      if (date_to) where.date[Op.lte] = date_to;
    }

    const appointments = await Appointment.findAll({
      where: { ...where, status: { [Op.ne]: 'cancelado' } },
      include: [
        { model: Service, as: 'service', attributes: ['name'] },
        { model: User, as: 'employee', attributes: ['first_name', 'last_name'] }
      ]
    });

    const totalRevenue = appointments.reduce((sum, a) => sum + parseFloat(a.total_price), 0);
    const totalAppointments = appointments.length;
    const byStatus = {
      solicitado: appointments.filter(a => a.status === 'solicitado').length,
      agendado: appointments.filter(a => a.status === 'agendado').length,
      completado: appointments.filter(a => a.status === 'completado').length,
      liquidado: appointments.filter(a => a.status === 'liquidado').length
    };

    const byService = {};
    appointments.forEach(a => {
      const name = a.service?.name || 'Desconocido';
      if (!byService[name]) byService[name] = { count: 0, revenue: 0 };
      byService[name].count++;
      byService[name].revenue += parseFloat(a.total_price);
    });

    res.json({
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      by_status: byStatus,
      by_service: byService
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
