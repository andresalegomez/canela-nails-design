import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, getStatusBadge, formatTime, formatDate } from '../../utils/helpers';
import { Calendar, CreditCard, Wallet, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ todayAppointments: 0, pendingApprovals: 0, cashBalance: 0, completedToday: 0 });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [cashData, appointmentsData, usersData] = await Promise.allSettled([
        api.getCashBalance(),
        api.getAppointments({ limit: 10, sort: 'date DESC' }),
        api.getUsers({ role: 'client', is_approved: false, limit: 10 })
      ]);

      if (cashData.status === 'fulfilled') {
        setStats(prev => ({ ...prev, cashBalance: cashData.value.balance || 0 }));
      }
      if (appointmentsData.status === 'fulfilled') {
        const appts = appointmentsData.value.appointments || appointmentsData.value || [];
        setRecentAppointments(Array.isArray(appts) ? appts.slice(0, 5) : []);
        const today = new Date().toISOString().split('T')[0];
        const todayAppts = Array.isArray(appts) ? appts.filter(a => a.date === today) : [];
        setStats(prev => ({
          ...prev,
          todayAppointments: todayAppts.length,
          completedToday: todayAppts.filter(a => a.status === 'completado').length
        }));
      }
      if (usersData.status === 'fulfilled') {
        const users = usersData.value.users || usersData.value || [];
        setPendingApprovals(Array.isArray(users) ? users : []);
        setStats(prev => ({ ...prev, pendingApprovals: Array.isArray(users) ? users.length : 0 }));
      }
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;

  const statCards = [
    { label: 'Turnos Hoy', value: stats.todayAppointments, icon: Calendar, color: 'bg-blue-500' },
    { label: 'Completados Hoy', value: stats.completedToday, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Pendientes Aprobación', value: stats.pendingApprovals, icon: Users, color: 'bg-yellow-500' },
    { label: 'Saldo Caja', value: formatCurrency(stats.cashBalance), icon: Wallet, color: 'bg-brand-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center`}>
              <card.icon size={24} className="text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-2xl font-bold">{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Appointments */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Turnos Recientes</h2>
          {recentAppointments.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay turnos recientes</p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map(apt => {
                const badge = getStatusBadge(apt.status);
                return (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        Turno #{apt.appointment_number} — {apt.service?.name || apt.Service?.name || 'Servicio'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(apt.date)} {formatTime(apt.start_time)} - {apt.client?.first_name || apt.Client?.first_name || apt.guestBooking?.first_name || 'Sin nombre'}
                      </div>
                    </div>
                    <span className={badge.class}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-yellow-500" />
            Usuarios Pendientes
          </h2>
          {pendingApprovals.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay usuarios pendientes de aprobación</p>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{user.first_name} {user.last_name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await api.approveUser(user.id); loadData(); }}
                      className="btn-success text-xs px-3 py-1"
                    >Aprobar</button>
                    <button
                      onClick={async () => { await api.rejectUser(user.id); loadData(); }}
                      className="btn-danger text-xs px-3 py-1"
                    >Rechazar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
