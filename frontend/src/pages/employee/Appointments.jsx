import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatTime, formatDate, getStatusBadge } from '../../utils/helpers';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => { loadAppointments(); }, [date, page]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await api.getEmployeeAppointments(user.id, { date, page, limit: 20 });
      setAppointments(data.appointments || data || []);
      setTotalPages(data.totalPages || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const changeDay = (offset) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().split('T')[0]);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Turnos</h1>

      <div className="flex items-center gap-4">
        <button onClick={() => changeDay(-1)} className="btn-secondary p-2"><ChevronLeft size={20} /></button>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setPage(1); }} className="input-field w-auto" />
        <button onClick={() => changeDay(1)} className="btn-secondary p-2"><ChevronRight size={20} /></button>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : appointments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay turnos para esta fecha</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Turno #</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(apt => {
                  const badge = getStatusBadge(apt.status);
                  return (
                    <tr key={apt.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">#{apt.appointment_number}</td>
                      <td className="px-4 py-3">{formatTime(apt.start_time)} - {formatTime(apt.end_time)}</td>
                      <td className="px-4 py-3">{apt.service?.name || apt.Service?.name || '-'}</td>
                      <td className="px-4 py-3">{apt.client?.first_name || apt.Client?.first_name || apt.guestBooking?.first_name || '-'} {apt.client?.last_name || apt.Client?.last_name || apt.guestBooking?.last_name || ''}</td>
                      <td className="px-4 py-3">{formatCurrency(apt.total_price)}</td>
                      <td className="px-4 py-3"><span className={badge.class}>{badge.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm">Anterior</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary text-sm">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  );
}
