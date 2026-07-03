import { useState, useEffect } from 'react';
import { Plus, CreditCard, RotateCcw, X, Search } from 'lucide-react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseTarget, setReverseTarget] = useState(null);

  const [filters, setFilters] = useState({
    employee_id: '',
    dateFrom: '',
    dateTo: '',
  });

  const [formData, setFormData] = useState({
    appointment_id: '',
    amount: '',
    payment_method: 'efectivo',
    virtual_surcharge_type: 'percent',
    virtual_surcharge_value: '',
    cash_amount: '',
    virtual_amount: '',
    partial_remaining: 0,
  });

  useEffect(() => {
    loadPayments();
  }, [page, filters]);

  useEffect(() => {
    if (showModal) {
      loadAppointments();
      loadEmployees();
    }
  }, [showModal]);

  async function loadPayments() {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.employee_id) params.employee_id = filters.employee_id;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await api.getPayments(params);
      setPayments(res.data.payments || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Error loading payments', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAppointments() {
    try {
      const res = await api.getAppointments({ status: 'completed' });
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error loading appointments', err);
    }
  }

  async function loadEmployees() {
    try {
      const res = await api.getEmployees();
      setEmployees(res.data.employees || []);
    } catch (err) {
      console.error('Error loading employees', err);
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleSelectAppointment(e) {
    const aptId = e.target.value;
    const apt = appointments.find(a => String(a.id) === String(aptId));
    if (apt) {
      const total = parseFloat(apt.total_amount) || 0;
      const paid = parseFloat(apt.total_paid) || 0;
      const remaining = total - paid;
      setFormData(prev => ({
        ...prev,
        appointment_id: aptId,
        amount: remaining > 0 ? remaining.toFixed(2) : '',
        partial_remaining: remaining,
        cash_amount: '',
        virtual_amount: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        appointment_id: '',
        amount: '',
        partial_remaining: 0,
      }));
    }
  }

  function handleAmountChange(e) {
    const val = e.target.value;
    const totalPaid = parseFloat(val) || 0;
    const remaining = formData.partial_remaining;
    setFormData(prev => ({
      ...prev,
      amount: val,
      cash_amount: prev.payment_method === 'mixto' ? '' : prev.cash_amount,
      virtual_amount: prev.payment_method === 'mixto' ? '' : prev.virtual_amount,
    }));
  }

  function calculateVirtualTotal() {
    const amount = parseFloat(formData.amount) || 0;
    const surchargeVal = parseFloat(formData.virtual_surcharge_value) || 0;
    if (formData.payment_method === 'virtual' || (formData.payment_method === 'mixto' && parseFloat(formData.virtual_amount) > 0)) {
      const base = formData.payment_method === 'virtual' ? amount : parseFloat(formData.virtual_amount) || 0;
      if (formData.virtual_surcharge_type === 'percent') {
        return base * (1 + surchargeVal / 100);
      } else {
        return base + surchargeVal;
      }
    }
    return amount;
  }

  function calculateClientPays() {
    if (formData.payment_method === 'virtual') {
      return calculateVirtualTotal();
    }
    if (formData.payment_method === 'mixto') {
      const cash = parseFloat(formData.cash_amount) || 0;
      const virt = parseFloat(formData.virtual_amount) || 0;
      const surchargeVal = parseFloat(formData.virtual_surcharge_value) || 0;
      let virtTotal = virt;
      if (formData.virtual_surcharge_type === 'percent') {
        virtTotal = virt * (1 + surchargeVal / 100);
      } else {
        virtTotal = virt + surchargeVal;
      }
      return cash + virtTotal;
    }
    return parseFloat(formData.amount) || 0;
  }

  function getRemainingAfterPayment() {
    const total = parseFloat(formData.amount) || 0;
    return formData.partial_remaining - total;
  }

  async function handleSubmitPayment(e) {
    e.preventDefault();
    try {
      const data = {
        appointment_id: formData.appointment_id,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
      };

      if (formData.payment_method === 'virtual') {
        data.virtual_surcharge_type = formData.virtual_surcharge_type;
        data.virtual_surcharge_value = parseFloat(formData.virtual_surcharge_value) || 0;
        data.client_pays = calculateClientPays();
      }

      if (formData.payment_method === 'mixto') {
        data.cash_amount = parseFloat(formData.cash_amount) || 0;
        data.virtual_amount = parseFloat(formData.virtual_amount) || 0;
        data.virtual_surcharge_type = formData.virtual_surcharge_type;
        data.virtual_surcharge_value = parseFloat(formData.virtual_surcharge_value) || 0;
        data.client_pays = calculateClientPays();
      }

      await api.createPayment(data);
      setShowModal(false);
      resetForm();
      loadPayments();
    } catch (err) {
      console.error('Error creating payment', err);
    }
  }

  async function handleReverse() {
    if (!reverseTarget) return;
    try {
      await api.reversePayment(reverseTarget.id);
      setShowReverseModal(false);
      setReverseTarget(null);
      loadPayments();
    } catch (err) {
      console.error('Error reversing payment', err);
    }
  }

  function resetForm() {
    setFormData({
      appointment_id: '',
      amount: '',
      payment_method: 'efectivo',
      virtual_surcharge_type: 'percent',
      virtual_surcharge_value: '',
      cash_amount: '',
      virtual_amount: '',
      partial_remaining: 0,
    });
  }

  function getAppointmentLabel(apt) {
    return `Turno #${apt.appointment_number} - ${apt.client_name} - ${formatCurrency(apt.total_amount)}`;
  }

  function getPaymentDescription(payment) {
    const apt = appointments.find(a => String(a.id) === String(payment.appointment_id));
    const aptLabel = apt ? `Turno #${apt.appointment_number}` : `Turno #${payment.appointment_id}`;
    const total = parseFloat(payment.amount) || 0;

    if (payment.payment_method === 'efectivo') {
      return `Pago ${aptLabel} - ${formatCurrency(total)} (efectivo)`;
    }
    if (payment.payment_method === 'virtual') {
      return `Pago ${aptLabel} - ${formatCurrency(total)} (virtual)`;
    }
    if (payment.payment_method === 'mixto') {
      const cash = parseFloat(payment.cash_amount) || 0;
      const virt = parseFloat(payment.virtual_amount) || 0;
      return `Pago ${aptLabel} - ${formatCurrency(total)} (${formatCurrency(cash)} efectivo + ${formatCurrency(virt)} virtual)`;
    }
    return `Pago ${aptLabel} - ${formatCurrency(total)}`;
  }

  function getMethodBadge(method) {
    const styles = {
      efectivo: 'bg-green-100 text-green-800',
      virtual: 'bg-blue-100 text-blue-800',
      mixto: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[method] || 'bg-gray-100 text-gray-800'}`}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Pagos</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus size={18} />
          Registrar Pago
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
            <select
              name="employee_id"
              value={filters.employee_id}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="">Todos los empleados</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
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
              onClick={() => { setFilters({ employee_id: '', dateFrom: '', dateTo: '' }); setPage(1); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No se encontraron pagos</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Turno</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Método</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        #{payment.appointment_number || payment.appointment_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {payment.client_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getMethodBadge(payment.payment_method)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                        {getPaymentDescription(payment)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        <div>{formatDate(payment.created_at)}</div>
                        <div className="text-xs text-gray-400">{formatTime(payment.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <button
                          onClick={() => { setReverseTarget(payment); setShowReverseModal(true); }}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Revertir pago"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Registrar Pago</h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                <select
                  name="appointment_id"
                  value={formData.appointment_id}
                  onChange={handleSelectAppointment}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="">Seleccionar turno completado</option>
                  {appointments.map(apt => (
                    <option key={apt.id} value={apt.id}>{getAppointmentLabel(apt)}</option>
                  ))}
                </select>
                {formData.appointment_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Saldo pendiente: {formatCurrency(formData.partial_remaining)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar ($)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleAmountChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
                {formData.appointment_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Saldo restante después del pago: {formatCurrency(getRemainingAfterPayment())}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="virtual">Virtual</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>

              {(formData.payment_method === 'virtual' || formData.payment_method === 'mixto') && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sobrecargo virtual</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                      <select
                        name="virtual_surcharge_type"
                        value={formData.virtual_surcharge_type}
                        onChange={handleFormChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      >
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.virtual_surcharge_type === 'percent' ? 'Porcentaje' : 'Monto'}
                      </label>
                      <input
                        type="number"
                        name="virtual_surcharge_value"
                        value={formData.virtual_surcharge_value}
                        onChange={handleFormChange}
                        min="0"
                        step="0.01"
                        placeholder={formData.virtual_surcharge_type === 'percent' ? '0' : '0.00'}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.payment_method === 'mixto' && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-purple-50">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Desglose</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo ($)</label>
                      <input
                        type="number"
                        name="cash_amount"
                        value={formData.cash_amount}
                        onChange={handleFormChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Virtual ($)</label>
                      <input
                        type="number"
                        name="virtual_amount"
                        value={formData.virtual_amount}
                        onChange={handleFormChange}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                      />
                    </div>
                  </div>
                  {parseFloat(formData.cash_amount) > 0 && parseFloat(formData.virtual_amount) > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      El cliente paga: {formatCurrency(calculateClientPays())}
                      {parseFloat(formData.virtual_surcharge_value) > 0 && (
                        <> (incluye sobrecargo virtual)</>
                      )}
                    </p>
                  )}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">Resumen del pago</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto del turno:</span>
                    <span className="font-medium">{formatCurrency(formData.partial_remaining)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto a pagar:</span>
                    <span className="font-medium">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                  {formData.payment_method === 'mixto' && parseFloat(formData.cash_amount) > 0 && parseFloat(formData.virtual_amount) > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efectivo:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(formData.cash_amount) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Virtual (sin sobrecargo):</span>
                        <span className="font-medium">{formatCurrency(parseFloat(formData.virtual_amount) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sobrecargo virtual:</span>
                        <span className="font-medium">{formatCurrency(calculateClientPays() - (parseFloat(formData.cash_amount) || 0) - (parseFloat(formData.virtual_amount) || 0))}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-1">
                        <span className="text-gray-800 font-medium">Total que paga el cliente:</span>
                        <span className="font-bold text-rose-600">{formatCurrency(calculateClientPays())}</span>
                      </div>
                    </>
                  )}
                  {formData.payment_method === 'virtual' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sobrecargo:</span>
                        <span className="font-medium">
                          {formData.virtual_surcharge_type === 'percent'
                            ? `${formData.virtual_surcharge_value || 0}%`
                            : formatCurrency(parseFloat(formData.virtual_surcharge_value) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-gray-300 pt-1">
                        <span className="text-gray-800 font-medium">Total que paga el cliente:</span>
                        <span className="font-bold text-rose-600">{formatCurrency(calculateClientPays())}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comisión sobre:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(parseFloat(formData.amount) || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-rose-600 text-white py-2 rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium"
                >
                  Registrar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReverseModal && reverseTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Revertir Pago</h2>
              <button
                onClick={() => { setShowReverseModal(false); setReverseTarget(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">
                  ¿Estás seguro de que deseas revertir este pago? Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Turno:</span>
                  <span className="font-medium">#{reverseTarget.appointment_number || reverseTarget.appointment_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{reverseTarget.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-medium">{formatCurrency(reverseTarget.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método:</span>
                  <span className="font-medium">{getMethodBadge(reverseTarget.payment_method)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{formatDate(reverseTarget.created_at)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowReverseModal(false); setReverseTarget(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReverse}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                >
                  Revertir pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
