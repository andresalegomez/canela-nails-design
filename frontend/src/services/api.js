const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Error en la solicitud');
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  approveUser: (id) => request(`/auth/approve/${id}`, { method: 'POST' }),
  rejectUser: (id) => request(`/auth/reject/${id}`, { method: 'POST' }),

  // Users
  getUsers: (params) => request(`/users?${new URLSearchParams(params)}`),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  blockUser: (id) => request(`/users/${id}/block`, { method: 'POST' }),
  unblockUser: (id) => request(`/users/${id}/unblock`, { method: 'POST' }),
  toggleCanCharge: (id) => request(`/users/${id}/toggle-can-charge`, { method: 'POST' }),

  // Services
  getServices: (params) => request(`/services?${new URLSearchParams(params || {})}`),
  getService: (id) => request(`/services/${id}`),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: (params) => request(`/employees?${new URLSearchParams(params || {})}`),
  getEmployeeSchedules: (id) => request(`/employees/${id}/schedules`),
  updateEmployeeSchedules: (id, data) => request(`/employees/${id}/schedules`, { method: 'PUT', body: JSON.stringify(data) }),
  getEmployeeBreaks: (id) => request(`/employees/${id}/breaks`),
  updateEmployeeBreaks: (id, data) => request(`/employees/${id}/breaks`, { method: 'PUT', body: JSON.stringify(data) }),
  getEmployeeServices: (id) => request(`/employees/${id}/services`),
  updateEmployeeServices: (id, data) => request(`/employees/${id}/services`, { method: 'PUT', body: JSON.stringify(data) }),
  getEmployeeAppointments: (id, params) => request(`/employees/${id}/appointments?${new URLSearchParams(params || {})}`),
  getEmployeeStats: (id) => request(`/employees/${id}/stats`),

  // Availability
  getAvailability: (params) => request(`/availability?${new URLSearchParams(params)}`),

  // Appointments
  getAppointments: (params) => request(`/appointments?${new URLSearchParams(params || {})}`),
  getAppointment: (id) => request(`/appointments/${id}`),
  createAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelAppointment: (id, data) => request(`/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify(data || {}) }),
  updateStatus: (id, status) => request(`/appointments/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  getClientAppointments: (params) => request(`/appointments/client?${new URLSearchParams(params || {})}`),

  // Payments
  getPayments: (params) => request(`/payments?${new URLSearchParams(params || {})}`),
  createPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  reversePayment: (id) => request(`/payments/${id}/reverse`, { method: 'POST' }),

  // Cash
  getCashBalance: () => request('/cash/balance'),
  addCash: (data) => request('/cash/add', { method: 'POST', body: JSON.stringify(data) }),
  withdrawCash: (data) => request('/cash/withdraw', { method: 'POST', body: JSON.stringify(data) }),
  getCashMovements: (params) => request(`/cash/movements?${new URLSearchParams(params || {})}`),

  // Liquidations
  getLiquidations: (params) => request(`/liquidations?${new URLSearchParams(params || {})}`),
  getLiquidationSummary: (employeeId) => request(`/liquidations/summary/${employeeId}`),
  createLiquidation: (data) => request('/liquidations', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getReportServices: (params) => request(`/reports/services?${new URLSearchParams(params || {})}`),
  getReportCash: (params) => request(`/reports/cash?${new URLSearchParams(params || {})}`),
  exportExcel: async (params) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/reports/excel?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Error al exportar');
    return res.blob();
  },

  // Notifications
  getNotifications: (since) => request(`/notifications?since=${since || 0}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),

  // Logs
  getLogs: (params) => request(`/logs?${new URLSearchParams(params || {})}`),

  // DB Manager
  getDbTables: () => request('/db-manager/tables'),
  getDbTableData: (name, params) => request(`/db-manager/tables/${name}?${new URLSearchParams(params || {})}`),
  createDbRow: (table, data) => request(`/db-manager/tables/${table}`, { method: 'POST', body: JSON.stringify(data) }),
  updateDbRow: (table, id, data) => request(`/db-manager/tables/${table}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDbRow: (table, id) => request(`/db-manager/tables/${table}/${id}`, { method: 'DELETE' }),
};

export default api;
