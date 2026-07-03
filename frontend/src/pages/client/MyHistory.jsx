import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, X, Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatTime, getStatusBadge } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

const MyHistory = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignAppointment, setReassignAppointment] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reassignLoading, setReassignLoading] = useState(false);
  const limit = 10;

  const statusFilters = [
    { value: 'todos', label: 'Todos' },
    { value: 'solicitado', label: 'Solicitado' },
    { value: 'agendado', label: 'Agendado' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'liquidado', label: 'Liquidado' }
  ];

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: currentPage,
        limit,
        ...(filterStatus !== 'todos' && { status: filterStatus })
      };
      const response = await api.getClientAppointments(params);
      setAppointments(response.appointments || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.total || 0);
    } catch (err) {
      setError('Error al cargar las citas. Por favor, intente de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterStatus]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const isMoreThan24hBefore = (appointmentDate) => {
    const appointmentTime = new Date(appointmentDate);
    const now = new Date();
    const diffMs = appointmentTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours > 24;
  };

  const handleViewDetails = async (appointmentId) => {
    try {
      const data = await api.getAppointment(appointmentId);
      setSelectedAppointment(data);
      setShowDetails(true);
    } catch (err) {
      console.error('Error fetching appointment details:', err);
      alert('Error al cargar los detalles de la cita.');
    }
  };

  const handleOpenCancelModal = (appointment) => {
    setSelectedAppointment(appointment);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      setCancelLoading(true);
      await api.cancelAppointment(selectedAppointment.id, { reason: cancelReason });
      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      fetchAppointments();
      alert('Cita cancelada exitosamente.');
    } catch (err) {
      console.error('Error canceling appointment:', err);
      alert(err.response?.data?.message || 'Error al cancelar la cita. Por favor, intente de nuevo.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleOpenReassignModal = async (appointment) => {
    try {
      setReassignAppointment(appointment);
      setSelectedDate('');
      setAvailableSlots([]);
      setSelectedSlot(null);
      setShowReassignModal(true);

      const today = new Date();
      const dates = [];
      for (let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      setAvailableDates(dates);
    } catch (err) {
      console.error('Error:', err);
      alert('Error al cargar fechas disponibles.');
    }
  };

  const handleDateSelect = async (date) => {
    if (!reassignAppointment) return;

    try {
      setSelectedDate(date);
      setSelectedSlot(null);
      const response = await api.getAvailability({
        employee_id: reassignAppointment.employee_id,
        service_id: reassignAppointment.service_id,
        date
      });
      setAvailableSlots(response.slots || response.available_slots || []);
    } catch (err) {
      console.error('Error fetching availability:', err);
      setAvailableSlots([]);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignAppointment || !selectedDate || !selectedSlot) return;

    try {
      setReassignLoading(true);
      await api.updateAppointment(reassignAppointment.id, {
        date: selectedDate,
        time: selectedSlot.time || selectedSlot.start_time
      });
      setShowReassignModal(false);
      setReassignAppointment(null);
      setSelectedDate('');
      setSelectedSlot(null);
      fetchAppointments();
      alert('Cita reasignada exitosamente.');
    } catch (err) {
      console.error('Error reassigning appointment:', err);
      alert('Error al reasignar la cita. Por favor, intente de nuevo.');
    } finally {
      setReassignLoading(false);
    }
  };

  const formatDateDisplay = (dateStr) => {
    try {
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  const formatTimeDisplay = (timeStr) => {
    try {
      return formatTime(timeStr);
    } catch {
      return timeStr;
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border-t border-gray-200 rounded-b-lg">
        <div className="text-sm text-gray-600">
          Mostrando {((currentPage - 1) * limit) + 1} a {Math.min(currentPage * limit, totalItems)} de {totalItems} citas
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 text-sm border rounded-md ${
                currentPage === page
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    const badge = getStatusBadge(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className || ''}`}>
        {badge.label || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-600" />
            Mi Historial de Citas
          </h1>
          <p className="mt-2 text-gray-600">Gestiona y revisa todas tus citas anteriores y próximas.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por estado</label>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === filter.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando citas...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No hay citas</h3>
            <p className="mt-2 text-gray-600">No se encontraron citas con el filtro seleccionado.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Turno #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Servicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profesional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{appointment.turno || appointment.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.service_name || appointment.service?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.employee_name || appointment.employee?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDateDisplay(appointment.date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{formatTimeDisplay(appointment.time || appointment.start_time)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStatusBadge(appointment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{formatCurrency(appointment.amount_paid || 0)} / {formatCurrency(appointment.total || appointment.price || 0)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewDetails(appointment.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Detalles</span>
                        </button>

                        {['solicitado', 'agendado'].includes(appointment.status) && (
                          <>
                            {isMoreThan24hBefore(appointment.date) ? (
                              <button
                                onClick={() => handleOpenCancelModal(appointment)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                title="Cancelar cita"
                              >
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline">Cancelar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenCancelModal(appointment)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                                title="Solicitar cancelación"
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span className="hidden sm:inline">Solicitar</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenReassignModal(appointment)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                              title="Reasignar cita"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span className="hidden sm:inline">Reasignar</span>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
        )}

        {showDetails && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Detalles de la Cita</h2>
                  <button
                    onClick={() => { setShowDetails(false); setSelectedAppointment(null); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Turno</p>
                      <p className="font-medium">#{selectedAppointment.turno || selectedAppointment.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 text-purple-600 flex items-center justify-center">💅</div>
                    <div>
                      <p className="text-sm text-gray-500">Servicio</p>
                      <p className="font-medium">{selectedAppointment.service_name || selectedAppointment.service?.name || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 text-purple-600 flex items-center justify-center">👤</div>
                    <div>
                      <p className="text-sm text-gray-500">Profesional</p>
                      <p className="font-medium">{selectedAppointment.employee_name || selectedAppointment.employee?.name || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Fecha</p>
                      <p className="font-medium">{formatDateDisplay(selectedAppointment.date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500">Hora</p>
                      <p className="font-medium">{formatTimeDisplay(selectedAppointment.time || selectedAppointment.start_time)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 text-purple-600 flex items-center justify-center">📊</div>
                    <div>
                      <p className="text-sm text-gray-500">Estado</p>
                      <div className="mt-1">{renderStatusBadge(selectedAppointment.status)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 text-purple-600 flex items-center justify-center">💰</div>
                    <div>
                      <p className="text-sm text-gray-500">Monto</p>
                      <p className="font-medium">
                        Pagado: {formatCurrency(selectedAppointment.amount_paid || 0)} / Total: {formatCurrency(selectedAppointment.total || selectedAppointment.price || 0)}
                      </p>
                    </div>
                  </div>

                  {selectedAppointment.notes && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Notas</p>
                      <p className="mt-1 text-gray-700">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => { setShowDetails(false); setSelectedAppointment(null); }}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Cancelar Cita</h2>
                  <button
                    onClick={() => { setShowCancelModal(false); setSelectedAppointment(null); setCancelReason(''); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {!isMoreThan24hBefore(selectedAppointment.date) && (
                  <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800">Cancelación con menos de 24 horas</p>
                        <p className="text-sm text-orange-700 mt-1">
                          La cancelación requiere aprobación del administrador. Recibirás una notificación cuando sea procesada.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-gray-700 mb-2">
                    ¿Estás seguro de que deseas cancelar la cita <strong>#{selectedAppointment.turno || selectedAppointment.id}</strong>?
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDateDisplay(selectedAppointment.date)} a las {formatTimeDisplay(selectedAppointment.time || selectedAppointment.start_time)}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo de cancelación (opcional)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="Ingresa el motivo de la cancelación..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCancelModal(false); setSelectedAppointment(null); setCancelReason(''); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleCancelAppointment}
                    disabled={cancelLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReassignModal && reassignAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Reasignar Cita</h2>
                  <button
                    onClick={() => { setShowReassignModal(false); setReassignAppointment(null); setSelectedDate(''); setAvailableSlots([]); setSelectedSlot(null); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Cita actual:</strong> {formatDateDisplay(reassignAppointment.date)} a las {formatTimeDisplay(reassignAppointment.time || reassignAppointment.start_time)}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Servicio:</strong> {reassignAppointment.service_name || reassignAppointment.service?.name}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Profesional:</strong> {reassignAppointment.employee_name || reassignAppointment.employee?.name}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Selecciona una nueva fecha
                  </label>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                    {availableDates.map(date => (
                      <button
                        key={date}
                        onClick={() => handleDateSelect(date)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          selectedDate === date
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formatDateDisplay(date)}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDate && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Horarios disponibles
                    </label>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay horarios disponibles para esta fecha.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSlot(slot)}
                            disabled={!slot.available}
                            className={`p-2 text-sm rounded-lg border transition-colors ${
                              !slot.available
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : selectedSlot === slot
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {slot.time || slot.start_time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowReassignModal(false); setReassignAppointment(null); setSelectedDate(''); setAvailableSlots([]); setSelectedSlot(null); }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmReassign}
                    disabled={!selectedDate || !selectedSlot || reassignLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reassignLoading ? 'Reasignando...' : 'Confirmar Reasignación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyHistory;