import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'employee') navigate('/empleado');
      else navigate('/cliente/reservar');
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">CN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Canela Nails Design</h1>
          <p className="text-gray-500 mt-1">Iniciá sesión para continuar</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label-field">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <LogIn size={18} />
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-brand-600 hover:underline font-medium">Registrate</Link>
          </div>
        </div>
      </div>
    </div>
  );
}