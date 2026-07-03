import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/helpers';
import { TrendingUp, Calendar, Award, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, appointmentsData] = await Promise.allSettled([
        api.getEmployeeStats(user.id),
        api.getEmployeeAppointments(user.id, { limit: 50 })
      ]);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (appointmentsData.status === 'fulfilled') setAppointments(appointmentsData.value.appointments || appointmentsData.value || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mis Estadísticas</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center"><Calendar size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Total Servicios</div><div className="text-2xl font-bold">{stats?.totalServices || 0}</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center"><TrendingUp size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Completados</div><div className="text-2xl font-bold">{stats?.completed || 0}</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center"><Award size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Comisión Estimada</div><div className="text-2xl font-bold">{formatCurrency(stats?.estimatedCommission || 0)}</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center"><Clock size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Liquidado</div><div className="text-2xl font-bold">{formatCurrency(stats?.liquidated || 0)}</div></div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Historial de Servicios</h2>
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay servicios registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Fecha</th>
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
                      <td className="px-4 py-3">{formatDate(apt.date)}</td>
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
      </div>
    </div>
  );
}
