import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminServices from './pages/admin/Services';
import AdminAppointments from './pages/admin/Appointments';
import AdminPayments from './pages/admin/Payments';
import AdminCash from './pages/admin/Cash';
import AdminLiquidations from './pages/admin/Liquidations';
import AdminReports from './pages/admin/Reports';
import AdminLogs from './pages/admin/Logs';
import AdminDB from './pages/admin/DBManager';
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeAppointments from './pages/employee/Appointments';
import EmployeeStats from './pages/employee/Stats';
import ClientBook from './pages/client/BookAppointment';
import ClientHistory from './pages/client/MyHistory';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'employee') return <Navigate to="/empleado" />;
  return <Navigate to="/cliente/reservar" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<HomeRedirect />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><Layout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="usuarios" element={<AdminUsers />} />
        <Route path="servicios" element={<AdminServices />} />
        <Route path="turnos" element={<AdminAppointments />} />
        <Route path="pagos" element={<AdminPayments />} />
        <Route path="caja" element={<AdminCash />} />
        <Route path="liquidaciones" element={<AdminLiquidations />} />
        <Route path="reportes" element={<AdminReports />} />
        <Route path="logs" element={<AdminLogs />} />
        <Route path="bd" element={<AdminDB />} />
      </Route>

      {/* Employee Routes */}
      <Route path="/empleado" element={<PrivateRoute roles={['employee']}><Layout /></PrivateRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="turnos" element={<EmployeeAppointments />} />
        <Route path="estadisticas" element={<EmployeeStats />} />
      </Route>

      {/* Client Routes */}
      <Route path="/cliente" element={<PrivateRoute roles={['client']}><Layout /></PrivateRoute>}>
        <Route path="reservar" element={<ClientBook />} />
        <Route path="historial" element={<ClientHistory />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
