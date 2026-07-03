import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatDate, formatTime } from '../../utils/helpers';
import {
  Users as UsersIcon,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
  Shield,
  UserCheck,
  UserX,
  Loader2,
} from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(20);

  const [filters, setFilters] = useState({
    role: '',
    search: '',
    is_approved: '',
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'client',
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
  });

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: 'client',
    first_name: '',
    last_name: '',
    dni: '',
    phone: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filters.role) params.role = filters.role;
      if (filters.search) params.search = filters.search;
      if (filters.is_approved) params.is_approved = filters.is_approved === 'true';

      const res = await api.getUsers(params);
      setUsers(res.data?.users || res.users || []);
      setTotalPages(res.data?.totalPages || res.totalPages || 1);
      setTotalItems(res.data?.totalItems || res.totalItems || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        role: 'client',
        first_name: '',
        last_name: '',
        dni: '',
        phone: '',
      });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al crear usuario');
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await api.updateUser(currentUser.id, editForm);
      setShowEditModal(false);
      setCurrentUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    try {
      await api.deleteUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al eliminar usuario');
    }
  };

  const handleBlock = async (id) => {
    try {
      await api.blockUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al bloquear usuario');
    }
  };

  const handleUnblock = async (id) => {
    try {
      await api.unblockUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al desbloquear usuario');
    }
  };

  const handleToggleCanCharge = async (id) => {
    try {
      await api.toggleCanCharge(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al cambiar permiso de cobro');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.approveUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al aprobar usuario');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas rechazar este usuario?')) return;
    try {
      await api.rejectUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Error al rechazar usuario');
    }
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'client',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      dni: user.dni || '',
      phone: user.phone || '',
    });
    setShowEditModal(true);
  };

  const isUserBlocked = (user) => user.is_blocked_user || user.blocked_user || false;
  const isEmailBlocked = (user) => user.is_blocked_email || user.blocked_email || false;
  const isDniBlocked = (user) => user.is_blocked_dni || user.blocked_dni || false;
  const isPhoneBlocked = (user) => user.is_blocked_phone || user.blocked_phone || false;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-pink-600" />
            <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition"
          >
            <Plus className="w-5 h-5" />
            Crear Usuario
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o DNI..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Todos los roles</option>
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
              <option value="client">Client</option>
            </select>
            <select
              value={filters.is_approved}
              onChange={(e) => handleFilterChange('is_approved', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="true">Aprobado</option>
              <option value="false">Pendiente</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-12 text-gray-500">
              No se encontraron usuarios
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                            <span className="text-pink-600 font-semibold text-sm">
                              {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">
                              {user.first_name} {user.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isEmailBlocked(user) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {user.email}
                        </span>
                        {isEmailBlocked(user) && (
                          <span className="ml-2 text-xs text-red-500">(bloqueado)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isDniBlocked(user) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {user.dni || '-'}
                        </span>
                        {isDniBlocked(user) && (
                          <span className="ml-2 text-xs text-red-500">(bloqueado)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${isPhoneBlocked(user) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {user.phone || '-'}
                        </span>
                        {isPhoneBlocked(user) && (
                          <span className="ml-2 text-xs text-red-500">(bloqueado)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'employee' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.is_approved ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-4 h-4" /> Aprobado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <XCircle className="w-4 h-4" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(user.created_at)} {formatTime(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {isUserBlocked(user) ? (
                            <button
                              onClick={() => handleUnblock(user.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Desbloquear usuario"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlock(user.id)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded"
                              title="Bloquear usuario"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleBlock(user.id)}
                            className={`p-1.5 rounded ${isEmailBlocked(user) ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                            title="Toggle bloquear email"
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          {user.role === 'employee' && (
                            <button
                              onClick={() => handleToggleCanCharge(user.id)}
                              className={`p-1.5 rounded ${user.can_charge_clients ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={user.can_charge_clients ? 'Puede cobrar (activado)' : 'Puede cobrar (desactivado)'}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}

                          {!user.is_approved && (
                            <>
                              <button
                                onClick={() => handleApprove(user.id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Aprobar"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(user.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                title="Rechazar"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-500">
            Mostrando {users.length} de {totalItems} usuarios
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-sm text-gray-700 px-3">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Crear Usuario</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="client">Client</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input
                    type="text"
                    value={createForm.dni}
                    onChange={(e) => setCreateForm({ ...createForm, dni: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && currentUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Editar Usuario</h2>
              <button onClick={() => { setShowEditModal(false); setCurrentUser(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditUser} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  <option value="client">Client</option>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input
                    type="text"
                    value={editForm.dni}
                    onChange={(e) => setEditForm({ ...editForm, dni: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setCurrentUser(null); }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}