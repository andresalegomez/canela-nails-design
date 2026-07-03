import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  LayoutDashboard, Users, Scissors, Calendar, CreditCard, Wallet,
  FileText, ClipboardList, Database, Bell, LogOut, Menu, X,
  Clock, BarChart3, ChevronDown, History
} from 'lucide-react';

const adminLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { to: '/admin/servicios', icon: Scissors, label: 'Servicios' },
  { to: '/admin/turnos', icon: Calendar, label: 'Turnos' },
  { to: '/admin/pagos', icon: CreditCard, label: 'Pagos' },
  { to: '/admin/caja', icon: Wallet, label: 'Caja' },
  { to: '/admin/liquidaciones', icon: ClipboardList, label: 'Liquidaciones' },
  { to: '/admin/reportes', icon: BarChart3, label: 'Reportes' },
  { to: '/admin/logs', icon: FileText, label: 'Logs' },
  { to: '/admin/bd', icon: Database, label: 'BD' },
];

const employeeLinks = [
  { to: '/empleado', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/empleado/turnos', icon: Calendar, label: 'Mis Turnos' },
  { to: '/empleado/estadisticas', icon: BarChart3, label: 'Estadísticas' },
];

const clientLinks = [
  { to: '/cliente/reservar', icon: Calendar, label: 'Reservar Turno' },
  { to: '/cliente/historial', icon: History, label: 'Mi Historial' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const links = user?.role === 'admin' ? adminLinks : user?.role === 'employee' ? employeeLinks : clientLinks;

  useEffect(() => {
    let lastId = parseInt(localStorage.getItem('lastNotificationId') || '0');
    const fetchNotifications = async () => {
      try {
        const data = await api.getNotifications(lastId);
        if (data.notifications && data.notifications.length > 0) {
          const current = JSON.parse(localStorage.getItem('notifications') || '[]');
          const updated = [...current, ...data.notifications].slice(-100);
          localStorage.setItem('notifications', JSON.stringify(updated));
          localStorage.setItem('lastNotificationId', data.notifications[data.notifications.length - 1].id);
          setNotifications(updated.reverse());
          setUnreadCount(updated.filter(n => !n.is_read).length);
        } else {
          setNotifications(JSON.parse(localStorage.getItem('notifications') || '[]').reverse());
          setUnreadCount(JSON.parse(localStorage.getItem('notifications') || '[]').filter(n => !n.is_read).length);
        }
      } catch (e) {}
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CN</span>
            </div>
            <span className="font-bold text-brand-700">Canela Nails</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu size={24} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-500 hover:text-gray-700"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100 font-semibold text-sm">Notificaciones</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">Sin notificaciones</div>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <div key={n.id} className={`p-3 border-b border-gray-50 text-sm ${!n.is_read ? 'bg-brand-50' : ''}`}>
                        <div className="font-medium">{n.title}</div>
                        <div className="text-gray-600 text-xs mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{user?.first_name} {user?.last_name}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role === 'admin' ? 'Administrador' : user?.role === 'employee' ? 'Empleado' : 'Cliente'}</div>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Cerrar sesión">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
