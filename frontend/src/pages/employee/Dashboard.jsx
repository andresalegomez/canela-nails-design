import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatTime, formatDate, getStatusBadge } from '../../utils/helpers';
import { Calendar, TrendingUp, Clock, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [todayData, statsData] = await Promise.allSettled([
        api.getEmployeeAppointments(user.id, { date: today }),
        api.getEmployeeStats(user.id)
      ]);
      if (todayData.status === 'fulfilled') {
        setAppointments(todayData.value.appointments || todayData.value || []);
      }
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hola, {user?.first_name} 👋</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center"><Calendar size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Turnos Hoy</div><div className="text-2xl font-bold">{appointments.length}</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center"><TrendingUp size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Completados</div><div className="text-2xl font-bold">{stats.completed || 0}</div></div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center"><Wallet size={24} className="text-white" /></div>
          <div><div className="text-sm text-gray-500">Comisión Estimada</div><div className="text-2xl font-bold">{formatCurrency(stats.estimatedCommission || 0)}</div></div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Mis Turnos de Hoy</h2>
        {appointments.length === 0 ? (
          <p className="text-gray-500 text-sm">No tenés turnos para hoy</p>
        ) : (
          <div className="space-y-3">
            {appointments.map(apt => {
              const badge = getStatusBadge(apt.status);
              return (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Turno #{apt.appointment_number} — {apt.service?.name || apt.Service?.name || ''}</div>
                    <div className="text-xs text-gray-500">{formatTime(apt.start_time)} - {formatTime(apt.end_time)} | {apt.client?.first_name || apt.Client?.first_name || apt.guestBooking?.first_name || 'Cliente'}</div>
                  </div>
                  <span className={badge.class}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
