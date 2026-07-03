import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatTime, formatDate, getStatusBadge, getDayName } from '../../utils/helpers';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Phone,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Eye,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'solicitado', label: 'Solicitado' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const emptyAppointment = {
  employee_id: '',
  service_id: '',
  date: '',
  time: '',
  client_type: 'client',
  client_id: '',
  guest_name: '',
  guest_last_name: '',
  guest_dni: '',
  guest_email: '',
  guest_phone: '',
};

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('calendar');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().split('T')[0]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [createForm, setCreateForm] = useState({ ...emptyAppointment });
  const [editForm, setEditForm] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadServices();
    loadClients();
  }, []);

  useEffect(() => {
    if (view === 'calendar') {
      loadAppointmentsForDate(calendarDate);
    } else {
      loadAppointments();
    }
  }, [view, page, filterEmployee, filterStatus, filterDateFrom, filterDateTo, calendarDate]);

  async function loadEmployees() {
    try {
      const data = await api.getEmployees();
      setEmployees(data.employees || data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadServices() {
    try {
      const data = await api.getServices();
      setServices(data.services || data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadClients() {
    try {
      const data = await api.getClientAppointments();
      setClients(data.clients || data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAppointments() {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (filterEmployee) params.employee_id = filterEmployee;
      if (filterStatus) params.status = filterStatus;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      const data = await api.getAppointments(params);
      setAppointments(data.appointments || data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAppointmentsForDate(date) {
    setLoading(true);
    try {
      const params = { date, limit: 100 };
      if (filterEmployee) params.employee_id = filterEmployee;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getAppointments(params);
      setAppointments(data.appointments || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailability() {
    if (!createForm.employee_id || !createForm.service_id || !createForm.date) {
      setAvailableSlots([]);
      return;
    }
    setSlotsLoading(true);
    try {
      const data = await api.getAvailability({
        employee_id: createForm.employee_id,
        service_id: createForm.service_id,
        date: createForm.date,
      });
      setAvailableSlots(data.slots || data.available_slots || data || []);
    } catch (err) {
      console.error(err);
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, [createForm.employee_id, createForm.service_id, createForm.date]);

  function navigateDay(offset) {
    const d = new Date(calendarDate);
    d.setDate(d.getDate() + offset);
    setCalendarDate(d.toISOString().split('T')[0]);
  }

  function handlePrevDay() {
    navigateDay(-1);
  }

  function handleNextDay() {
    navigateDay(1);
  }

  async function handleCreate() {
    try {
      const payload = {
        employee_id: createForm.employee_id,
        service_id: createForm.service_id,
        date: createForm.date,
        time: createForm.time,
      };
      if (createForm.client_type === 'client') {
        payload.client_id = createForm.client_id;
      } else {
        payload.guest_name = createForm.guest_name;
        payload.guest_last_name = createForm.guest_last_name;
        payload.guest_dni = createForm.guest_dni;
        payload.guest_email = createForm.guest_email;
        payload.guest_phone = createForm.guest_phone;
      }
      await api.createAppointment(payload);
      setShowCreateModal(false);
      setCreateForm({ ...emptyAppointment });
      if (view === 'calendar') {
        loadAppointmentsForDate(calendarDate);
      } else {
        loadAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleEdit() {
    try {
      await api.updateAppointment(selectedAppointment.id, editForm);
      setShowEditModal(false);
      setSelectedAppointment(null);
      if (view === 'calendar') {
        loadAppointmentsForDate(calendarDate);
      } else {
        loadAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
    try {
      await api.cancelAppointment(id, { status: 'cancelado' });
      if (view === 'calendar') {
        loadAppointmentsForDate(calendarDate);
      } else {
        loadAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkCompleted(id) {
    try {
      await api.updateStatus(id, 'completado');
      if (view === 'calendar') {
        loadAppointmentsForDate(calendarDate);
      } else {
        loadAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function openEdit(appointment) {
    setSelectedAppointment(appointment);
    setEditForm({
      date: appointment.date,
      time: appointment.time || appointment.hour,
      employee_id: appointment.employee_id,
      service_id: appointment.service_id,
      status: appointment.status,
      cost: appointment.cost || appointment.price || '',
    });
    setShowEditModal(true);
  }

  function openDetail(appointment) {
    setSelectedAppointment(appointment);
    setShowDetailModal(true);
  }

  function getEmployeeName(id) {
    const emp = employees.find((e) => e.id === id || e.employee_id === id);
    return emp ? `${emp.first_name || emp.name} ${emp.last_name || ''}`.trim() : '—';
  }

  function getServiceName(id) {
    const svc = services.find((s) => s.id === id || s.service_id === id);
    return svc ? svc.name || svc.title : '—';
  }

  function getWhatsAppLink(phone) {
    if (!phone) return '#';
    const cleaned = phone.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleaned.replace('+', '')}?text=Hola`;
  }

  function renderStatusBadge(status) {
    const info = getStatusBadge(status);
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${info?.className || 'bg-gray-200 text-gray-700'}`}
      >
        {info?.label || status}
      </span>
    );
  }

  const solicitadoAppointments = appointments.filter(
    (a) => a.status === 'solicitado'
  );

  const calendarAppointments = appointments;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-pink-600">Citas</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              view === 'calendar' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Calendar size={16} /> Calendario
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${
              view === 'list' ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Eye size={16} /> Lista
          </button>
          <button
            onClick={() => {
              setCreateForm({ ...emptyAppointment });
              setShowCreateModal(true);
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-pink-600 text-white flex items-center gap-1 hover:bg-pink-700"
          >
            <Plus size={16} /> Nueva Cita
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filterEmployee}
          onChange={(e) => { setFilterEmployee(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Todos los empleados</option>
          {employees.map((emp) => (
            <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
              {emp.first_name || emp.name} {emp.last_name || ''}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {view === 'list' && (
          <>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Desde"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Hasta"
            />
          </>
        )}
      </div>

      {view === 'calendar' && (
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-full bg-white border hover:bg-gray-50"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-800">
                {getDayName(calendarDate)} {formatDate(calendarDate)}
              </h2>
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 rounded-full bg-white border hover:bg-gray-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {solicitadoAppointments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-600 mb-3 uppercase tracking-wide">
                Solicitudes Pendientes ({solicitadoAppointments.length})
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {solicitadoAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="border-2 border-amber-400 bg-amber-50 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-amber-700">
                        {appt.client_name || appt.guest_name || 'Cliente'}
                      </span>
                      {renderStatusBadge(appt.status)}
                    </div>
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {formatDate(appt.date)} — {getDayName(appt.date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        {formatTime(appt.time || appt.hour)}
                      </div>
                      <div>Servicio: {getServiceName(appt.service_id)}</div>
                      <div>Empleado: {getEmployeeName(appt.employee_id)}</div>
                      {appt.client_email && (
                        <div className="text-gray-500 text-xs">Email: {appt.client_email}</div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      {(appt.client_phone || appt.guest_phone) && (
                        <>
                          <a
                            href={`tel:${appt.client_phone || appt.guest_phone}`}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600"
                          >
                            <Phone size={12} /> Llamar
                          </a>
                          <a
                            href={getWhatsAppLink(appt.client_phone || appt.guest_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                          >
                            <MessageCircle size={12} /> WhatsApp
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => handleMarkCompleted(appt.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600"
                      >
                        <Check size={12} /> Completar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Todas las citas del día ({calendarAppointments.length})
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : calendarAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No hay citas para este día
              </div>
            ) : (
              <div className="space-y-2">
                {calendarAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between border rounded-xl p-3 bg-white hover:shadow-sm transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[48px]">
                        <div className="text-sm font-bold text-pink-600">
                          {formatTime(appt.time || appt.hour)}
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-800">
                          {appt.client_name || appt.guest_name || 'Sin cliente'}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {getServiceName(appt.service_id)} · {getEmployeeName(appt.employee_id)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(appt.status)}
                      {(appt.client_phone || appt.guest_phone) && (
                        <a
                          href={getWhatsAppLink(appt.client_phone || appt.guest_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-500 hover:text-green-700"
                        >
                          <MessageCircle size={16} />
                        </a>
                      )}
                      <button
                        onClick={() => openDetail(appt)}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(appt)}
                        className="p-1.5 text-blue-500 hover:text-blue-700"
                      >
                        <Edit size={16} />
                      </button>
                      {appt.status !== 'completado' && appt.status !== 'cancelado' && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          className="p-1.5 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No se encontraron citas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">Fecha</th>
                    <th className="pb-2 font-medium">Hora</th>
                    <th className="pb-2 font-medium">Cliente</th>
                    <th className="pb-2 font-medium">Servicio</th>
                    <th className="pb-2 font-medium">Empleado</th>
                    <th className="pb-2 font-medium">Estado</th>
                    <th className="pb-2 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">{formatDate(appt.date)}</td>
                      <td className="py-3">{formatTime(appt.time || appt.hour)}</td>
                      <td className="py-3">
                        {appt.client_name || appt.guest_name || '—'}
                        {appt.client_phone && (
                          <span className="text-xs text-gray-400 ml-1">
                            {appt.client_phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3">{getServiceName(appt.service_id)}</td>
                      <td className="py-3">{getEmployeeName(appt.employee_id)}</td>
                      <td className="py-3">{renderStatusBadge(appt.status)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {(appt.client_phone || appt.guest_phone) && (
                            <a
                              href={getWhatsAppLink(appt.client_phone || appt.guest_phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-green-500 hover:text-green-700"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                          {appt.client_phone && (
                            <a
                              href={`tel:${appt.client_phone}`}
                              className="p-1.5 text-blue-500 hover:text-blue-700"
                            >
                              <Phone size={15} />
                            </a>
                          )}
                          <button
                            onClick={() => openDetail(appt)}
                            className="p-1.5 text-gray-400 hover:text-gray-600"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(appt)}
                            className="p-1.5 text-blue-500 hover:text-blue-700"
                          >
                            <Edit size={15} />
                          </button>
                          {appt.status !== 'completado' && appt.status !== 'cancelado' && (
                            <button
                              onClick={() => handleMarkCompleted(appt.id)}
                              className="p-1.5 text-emerald-500 hover:text-emerald-700"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {appt.status !== 'completado' && appt.status !== 'cancelado' && (
                            <button
                              onClick={() => handleCancel(appt.id)}
                              className="p-1.5 text-red-500 hover:text-red-700"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Detalle de Cita</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium">
                  {formatDate(selectedAppointment.date)} — {getDayName(selectedAppointment.date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hora</span>
                <span className="font-medium">
                  {formatTime(selectedAppointment.time || selectedAppointment.hour)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Servicio</span>
                <span className="font-medium">{getServiceName(selectedAppointment.service_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Empleado</span>
                <span className="font-medium">{getEmployeeName(selectedAppointment.employee_id)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">
                  {selectedAppointment.client_name || selectedAppointment.guest_name || '—'}
                </span>
              </div>
              {selectedAppointment.client_phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Teléfono</span>
                  <span className="font-medium">{selectedAppointment.client_phone}</span>
                </div>
              )}
              {selectedAppointment.client_email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium">{selectedAppointment.client_email}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Estado</span>
                {renderStatusBadge(selectedAppointment.status)}
              </div>
              {(selectedAppointment.cost || selectedAppointment.price) && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Costo</span>
                  <span className="font-medium">
                    {formatCurrency(selectedAppointment.cost || selectedAppointment.price)}
                  </span>
                </div>
              )}
            </div>
            {(selectedAppointment.client_phone || selectedAppointment.guest_phone) && (
              <div className="flex gap-2 mt-5">
                <a
                  href={`tel:${selectedAppointment.client_phone || selectedAppointment.guest_phone}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                >
                  <Phone size={14} /> Llamar
                </a>
                <a
                  href={getWhatsAppLink(
                    selectedAppointment.client_phone || selectedAppointment.guest_phone
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Editar Cita</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editForm.date || ''}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Hora (HH:MM)</label>
                <input
                  type="time"
                  value={editForm.time || ''}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Empleado</label>
                <select
                  value={editForm.employee_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar empleado</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                      {emp.first_name || emp.name} {emp.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Servicio</label>
                <select
                  value={editForm.service_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, service_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar servicio</option>
                  {services.map((svc) => (
                    <option key={svc.id || svc.service_id} value={svc.id || svc.service_id}>
                      {svc.name || svc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Estado</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Costo</label>
                <input
                  type="number"
                  value={editForm.cost || ''}
                  onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Nueva Cita</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Empleado</label>
                <select
                  value={createForm.employee_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, employee_id: e.target.value, time: '' })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar empleado</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                      {emp.first_name || emp.name} {emp.last_name || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Servicio</label>
                <select
                  value={createForm.service_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, service_id: e.target.value, time: '' })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar servicio</option>
                  {services.map((svc) => (
                    <option key={svc.id || svc.service_id} value={svc.id || svc.service_id}>
                      {svc.name || svc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, date: e.target.value, time: '' })
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Hora disponible
                  {slotsLoading && <span className="text-gray-400 ml-2">Cargando...</span>}
                </label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => {
                      const timeVal = typeof slot === 'string' ? slot : slot.time || slot.hour;
                      return (
                        <button
                          key={timeVal}
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, time: timeVal })}
                          className={`py-2 rounded-lg text-sm font-medium border transition ${
                            createForm.time === timeVal
                              ? 'bg-pink-600 text-white border-pink-600'
                              : 'border-gray-200 hover:border-pink-300'
                          }`}
                        >
                          {formatTime(timeVal)}
                        </button>
                      );
                    })}
                  </div>
                ) : createForm.employee_id && createForm.service_id && createForm.date && !slotsLoading ? (
                  <p className="text-sm text-gray-400">No hay horarios disponibles</p>
                ) : (
                  <p className="text-sm text-gray-400">
                    Selecciona empleado, servicio y fecha
                  </p>
                )}
              </div>

              <div className="border-t pt-3 mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cliente</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, client_type: 'client' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                      createForm.client_type === 'client'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    Cliente Existente
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, client_type: 'guest' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                      createForm.client_type === 'guest'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    Invitado
                  </button>
                </div>

                {createForm.client_type === 'client' ? (
                  <select
                    value={createForm.client_id}
                    onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((cl) => (
                      <option key={cl.id || cl.client_id} value={cl.id || cl.client_id}>
                        {cl.first_name || cl.name} {cl.last_name || ''}{' '}
                        {cl.email ? `(${cl.email})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={createForm.guest_name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, guest_name: e.target.value })
                        }
                        className="border rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={createForm.guest_last_name}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, guest_last_name: e.target.value })
                        }
                        className="border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="DNI"
                      value={createForm.guest_dni}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, guest_dni: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={createForm.guest_email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, guest_email: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={createForm.guest_phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, guest_phone: e.target.value })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!createForm.time}
                className="flex-1 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700 disabled:opacity-50"
              >
                Crear Cita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
