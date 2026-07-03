const ExcelJS = require('exceljs');
const { formatTime } = require('./validators');

async function generateAppointmentReport(data, title = 'Reporte de Turnos') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Canela Nails Design';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title);

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Turno #', key: 'appointment_number', width: 10 },
    { header: 'Cliente', key: 'client_name', width: 25 },
    { header: 'DNI', key: 'dni', width: 15 },
    { header: 'Servicio', key: 'service_name', width: 25 },
    { header: 'Empleado', key: 'employee_name', width: 25 },
    { header: 'Hora', key: 'time', width: 12 },
    { header: 'Monto', key: 'amount', width: 15 },
    { header: 'Estado', key: 'status', width: 15 }
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4A373' } };

  data.forEach(item => {
    sheet.addRow({
      date: item.date,
      appointment_number: item.appointment_number,
      client_name: item.client_name,
      dni: item.dni,
      service_name: item.service_name,
      employee_name: item.employee_name,
      time: formatTime(item.time),
      amount: item.amount,
      status: item.status
    });
  });

  return workbook;
}

async function generateEmployeeReport(data, employeeName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Canela Nails Design';

  const sheet = workbook.addWorksheet(`Reporte - ${employeeName}`);

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 15 },
    { header: 'Turno #', key: 'appointment_number', width: 10 },
    { header: 'Cliente', key: 'client_name', width: 25 },
    { header: 'Servicio', key: 'service_name', width: 25 },
    { header: 'Monto', key: 'amount', width: 15 },
    { header: 'Comisión %', key: 'commission_percent', width: 12 },
    { header: 'Comisión $', key: 'commission_amount', width: 15 }
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4A373' } };

  data.forEach(item => {
    sheet.addRow({
      date: item.date,
      appointment_number: item.appointment_number,
      client_name: item.client_name,
      service_name: item.service_name,
      amount: item.amount,
      commission_percent: item.commission_percent,
      commission_amount: item.commission_amount
    });
  });

  return workbook;
}

async function generateCashReport(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Canela Nails Design';

  const sheet = workbook.addWorksheet('Reporte de Caja');

  sheet.columns = [
    { header: 'Fecha', key: 'date', width: 18 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Efectivo', key: 'cash_amount', width: 15 },
    { header: 'Virtual', key: 'virtual_amount', width: 15 },
    { header: 'Total', key: 'amount', width: 15 }
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4A373' } };

  data.forEach(item => {
    sheet.addRow({
      date: item.created_at,
      type: item.type,
      description: item.description,
      cash_amount: item.cash_amount || 0,
      virtual_amount: item.virtual_amount || 0,
      amount: item.amount
    });
  });

  return workbook;
}

module.exports = { generateAppointmentReport, generateEmployeeReport, generateCashReport };
