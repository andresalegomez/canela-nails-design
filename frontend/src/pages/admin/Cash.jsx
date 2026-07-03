import { useState, useEffect } from 'react';
import { Wallet, Plus, Minus, ArrowUpCircle, ArrowDownCircle, Search } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';

export default function Cash() {
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const [addForm, setAddForm] = useState({ amount: '', description: '' });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBalance();
    loadMovements();
  }, [page, filters]);

  async function loadBalance() {
    try {
      const res = await api.getCashBalance();
      setBalance(res.data?.balance ?? res.balance ?? 0);
    } catch (err) {
      console.error('Error loading balance', err);
    }
  }

  async function loadMovements() {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await api.getCashMovements(params);
      setMovements(res.data?.movements || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotalItems(res.data?.totalItems || 0);
    } catch (err) {
      console.error('Error loading movements', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({ dateFrom: '', dateTo: '' });
    setPage(1);
  }

  async function handleAdd(e) {
    e.preventDefault();
    const amount = parseFloat(addForm.amount);
    if (!amount || amount <= 0 || !addForm.description.trim()) return;
    setSubmitting(true);
    try {
      await api.addCash({ amount, description: addForm.description.trim() });
      setShowAddModal(false);
      setAddForm({ amount: '', description: '' });
      loadBalance();
      loadMovements();
    } catch (err) {
      console.error('Error adding cash', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(e) {
    e.preventDefault();
    const amount = parseFloat(withdrawForm.amount);
    if (!amount || amount <= 0 || !withdrawForm.description.trim()) return;
    setSubmitting(true);
    try {
      await api.withdrawCash({ amount, description: withdrawForm.description.trim() });
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', description: '' });
      loadBalance();
      loadMovements();
    } catch (err) {
      console.error('Error withdrawing cash', err);
    } finally {
      setSubmitting(false);
    }
  }

  function getMovementDescription(mov) {
    const isMixed = (mov.reference_type === 'payment' || mov.reference_type === 'liquidation') &&
      (parseFloat(mov.cash_amount) > 0 && parseFloat(mov.virtual_amount) > 0);

    if (isMixed) {
      const total = parseFloat(mov.amount) || 0;
      const cash = parseFloat(mov.cash_amount) || 0;
      const virtual = parseFloat(mov.virtual_amount) || 0;
      return `${mov.description} - ${formatCurrency(total)} total (${formatCurrency(cash)} efectivo + ${formatCurrency(virtual)} virtual)`;
    }

    return mov.description || '-';
  }

  function getTypeBadge(type) {
    if (type === 'ingreso') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <ArrowUpCircle size={14} />
          Ingreso
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <ArrowDownCircle size={14} />
        Egreso
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-8 h-8 text-rose-600" />
          <h1 className="text-2xl font-bold text-gray-800">Caja</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Ingresar
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <Minus size={18} />
            Retirar
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl shadow-lg p-8 mb-6 text-white text-center">
        <p className="text-sm font-medium uppercase tracking-wider opacity-80 mb-2">Saldo actual en caja</p>
        <p className="text-5xl font-bold">{formatCurrency(balance)}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>
        ) : movements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Wallet size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No se encontraron movimientos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Efectivo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Virtual</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Turno #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        <div>{formatDate(mov.created_at)}</div>
                        <div className="text-xs text-gray-400">{formatTime(mov.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{getTypeBadge(mov.type)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${mov.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {mov.type === 'ingreso' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {mov.cash_amount != null && parseFloat(mov.cash_amount) > 0
                          ? formatCurrency(mov.cash_amount)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {mov.virtual_amount != null && parseFloat(mov.virtual_amount) > 0
                          ? formatCurrency(mov.virtual_amount)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {getMovementDescription(mov)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {mov.appointment_number ? `#${mov.appointment_number}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {mov.registered_by_name || mov.registered_by || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages} ({totalItems} movimientos)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ArrowUpCircle size={20} className="text-green-600" />
                Ingresar dinero
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setAddForm({ amount: '', description: '' }); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input
                  type="number"
                  value={addForm.amount}
                  onChange={e => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  placeholder="Ej: Fondo inicial, Reposición de caja..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setAddForm({ amount: '', description: '' }); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <ArrowDownCircle size={20} className="text-red-600" />
                Retirar dinero
              </h2>
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawForm({ amount: '', description: '' }); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleWithdraw} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
                <input
                  type="number"
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={withdrawForm.description}
                  onChange={e => setWithdrawForm(prev => ({ ...prev, description: e.target.value }))}
                  required
                  placeholder="Ej: Pago a proveedor, Retiro personal..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowWithdrawModal(false); setWithdrawForm({ amount: '', description: '' }); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Procesando...' : 'Retirar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
