import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', username: '', first_name: '', last_name: '', dni: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await register(form);
      setSuccess('Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Error al registrar');
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
          <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-500 mt-1">Registrate para reservar turnos</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}
            <div>
              <label className="label-field">Nombre de usuario</label>
              <input type="text" name="username" value={form.username} onChange={handleChange} className="input-field" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Nombre</label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Apellido</label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className="input-field" required />
              </div>
            </div>
            <div>
              <label className="label-field">Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="label-field">Contraseña</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field" required minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">DNI</label>
                <input type="text" name="dni" value={form.dni} onChange={handleChange} className="input-field" required />
              </div>
              <div>
                <label className="label-field">Teléfono</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} className="input-field" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <UserPlus size={18} />
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </form>
          <div className="mt-4 text-center text-sm text-gray-500">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-brand-600 hover:underline font-medium">Iniciá sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}