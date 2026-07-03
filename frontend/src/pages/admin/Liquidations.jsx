import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import { ClipboardList, Check, Search, ChevronDown } from 'lucide-react';

const Liquidations = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [pendingServices, setPendingServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [cashAmount, setCashAmount] = useState('');
  const [virtualAmount, setVirtualAmount] = useState('');
  const [confirming, setConfirming] = useState(false);

  const [liquidations, setLiquidations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [historyEmployeeFilter, setHistoryEmployeeFilter] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await api.getEmployees();
        setEmployees(data);
      } catch (err) {
        console.error('Error loading employees:', err);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  const fetchPendingServices = useCallback(async (employeeId) => {
    if (!employeeId) {
      setPendingServices([]);
      setSelectedServices(new Set());
      return;
    }
    setLoading(true);
    try {
      const data = await api.getLiquidationSummary(employeeId);
      setPendingServices(data.pending || []);
      setSelectedServices(new Set());
    } catch (err) {
      console.error('Error loading pending services:', err);
      setPendingServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLiquidations = useCallback(async (pageNum = 1, empFilter = '') => {
    setLoadingHistory(true);
    try {
      const params = { page: pageNum, limit: 10 };
      if (empFilter) params.employee_id = empFilter;
      const data = await api.getLiquidations(params);
      setLiquidations(data.liquidations || data.data || []);
      setTotalPages(data.totalPages || data.total_pages || 1);
    } catch (err) {
      console.error('Error loading liquidations:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingServices(selectedEmployee);
  }, [selectedEmployee, fetchPendingServices]);

  useEffect(() => {
    fetchLiquidations(page, historyEmployeeFilter);
  }, [page, historyEmployeeFilter, fetchLiquidations]);

  const handleEmployeeChange = (e) => {
    setSelectedEmployee(e.target.value);
    setSearchTerm('');
  };

  const filteredServices = pendingServices.filter((svc) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (svc.appointment_number && svc.appointment_number.toString().includes(term)) ||
      (svc.service_name && svc.service_name.toLowerCase().includes(term)) ||
      (svc.client_name && svc.client_name.toLowerCase().includes(term)) ||
      (svc.date && svc.date.includes(term))
    );
  });

  const toggleSelectAll = () => {
    if (selectedServices.size === filteredServices.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(filteredServices.map((s) => s.appointment_id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectedTotal = pendingServices
    .filter((s) => selectedServices.has(s.appointment_id))
    .reduce((sum, s) => sum + (s.commission_amount || 0), 0);

  const selectedSummaryServices = pendingServices.filter((s) =>
    selectedServices.has(s.appointment_id)
  );

  const selectedEmployeeName =
    employees.find((e) => e.id === selectedEmployee || e.employee_id === selectedEmployee)
      ?.name || 'N/A';

  const openConfirmationModal = () => {
    if (selectedServices.size === 0) return;
    setPaymentMethod('efectivo');
    setCashAmount(selectedTotal.toString());
    setVirtualAmount('0');
    setShowModal(true);
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method === 'efectivo') {
      setCashAmount(selectedTotal.toString());
      setVirtualAmount('0');
    } else if (method === 'virtual') {
      setCashAmount('0');
      setVirtualAmount(selectedTotal.toString());
    } else {
      setCashAmount('');
      setVirtualAmount('');
    }
  };

  const handleConfirmLiquidation = async () => {
    if (confirming) return;

    const cash = parseFloat(cashAmount) || 0;
    const virtual = parseFloat(virtualAmount) || 0;

    if (paymentMethod === 'mixto') {
      const totalSplit = cash + virtual;
      if (Math.abs(totalSplit - selectedTotal) > 0.01) {
        alert(`La suma de efectivo (${formatCurrency(cash)}) y virtual (${formatCurrency(virtual)}) debe ser igual al total (${formatCurrency(selectedTotal)})`);
        return;
      }
    }

    setConfirming(true);
    try {
      const payload = {
        employee_id: selectedEmployee,
        appointment_ids: Array.from(selectedServices),
        payment_method: paymentMethod,
        cash_amount: cash,
        virtual_amount: virtual,
        description: `Liquidación de ${selectedSummaryServices.length} servicio(s) - ${selectedEmployeeName}`,
      };
      await api.createLiquidation(payload);
      setShowModal(false);
      setSelectedServices(new Set());
      fetchPendingServices(selectedEmployee);
      setPage(1);
      fetchLiquidations(1, historyEmployeeFilter);
    } catch (err) {
      console.error('Error creating liquidation:', err);
      alert('Error al crear la liquidación. Intente de nuevo.');
    } finally {
      setConfirming(false);
    }
  };

  const isAllSelected =
    filteredServices.length > 0 && selectedServices.size === filteredServices.length;
  const now = new Date();
  const liquidationDateTime = `${formatDate(now.toISOString())} ${formatTime(now.toTimeString().slice(0, 5))}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="w-8 h-8 text-pink-600" />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Liquidaciones</h1>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Seleccionar Empleada</h2>
          <div className="relative">
            <select
              value={selectedEmployee}
              onChange={handleEmployeeChange}
              disabled={loadingEmployees}
              className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent pr-10"
            >
              <option value="">
                {loadingEmployees ? 'Cargando empleadas...' : '-- Seleccionar empleada --'}
              </option>
              {employees.map((emp) => (
                <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                  {emp.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {selectedEmployee && (
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-gray-700">
                Servicios Pendientes
                {pendingServices.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({pendingServices.length})
                  </span>
                )}
              </h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">Cargando servicios pendientes...</div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {pendingServices.length === 0
                  ? 'No hay servicios pendientes de liquidar.'
                  : 'No se encontraron resultados.'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                          />
                        </th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Turno #</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Fecha</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Hora</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Servicio</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-600">Cliente</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">Monto</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-600">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map((svc) => (
                        <tr
                          key={svc.appointment_id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            selectedServices.has(svc.appointment_id) ? 'bg-pink-50' : ''
                          }`}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedServices.has(svc.appointment_id)}
                              onChange={() => toggleSelectOne(svc.appointment_id)}
                              className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                            />
                          </td>
                          <td className="px-3 py-3 text-gray-700 font-medium">
                            #{svc.appointment_number}
                          </td>
                          <td className="px-3 py-3 text-gray-600">{formatDate(svc.date)}</td>
                          <td className="px-3 py-3 text-gray-600">{formatTime(svc.time)}</td>
                          <td className="px-3 py-3 text-gray-700">{svc.service_name}</td>
                          <td className="px-3 py-3 text-gray-700">{svc.client_name}</td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            {formatCurrency(svc.base_price)}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700 font-medium">
                            {formatCurrency(svc.commission_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-4 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {selectedServices.size} de {filteredServices.length} seleccionados
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-bold text-gray-800">
                      Total seleccionado: <span className="text-pink-600">{formatCurrency(selectedTotal)}</span>
                    </div>
                    <button
                      onClick={openConfirmationModal}
                      disabled={selectedServices.size === 0}
                      className="px-6 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Liquidar Seleccionados
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Historial de Liquidaciones</h2>
          <div className="mb-4">
            <div className="relative inline-block w-full md:w-72">
              <select
                value={historyEmployeeFilter}
                onChange={(e) => {
                  setHistoryEmployeeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent pr-10"
              >
                <option value="">Todas las empleadas</option>
                {employees.map((emp) => (
                  <option key={emp.id || emp.employee_id} value={emp.id || emp.employee_id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">Cargando historial...</div>
          ) : liquidations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay liquidaciones registradas.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">Fecha</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">Empleada</th>
                      <th className="px-3 py-3 text-center font-semibold text-gray-600">Servicios</th>
                      <th className="px-3 py-3 text-right font-semibold text-gray-600">Total</th>
                      <th className="px-3 py-3 text-left font-semibold text-gray-600">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidations.map((liq) => (
                      <tr
                        key={liq.id || liq.liquidation_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="px-3 py-3 text-gray-700">
                          {formatDate(liq.created_at || liq.date)}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {liq.employee_name || liq.employee?.name || 'N/A'}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {liq.service_count || liq.appointment_count || 0}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-800">
                          {formatCurrency(liq.total_amount || liq.total || 0)}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              liq.payment_method === 'efectivo'
                                ? 'bg-green-100 text-green-800'
                                : liq.payment_method === 'virtual'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {liq.payment_method === 'efectivo'
                              ? 'Efectivo'
                              : liq.payment_method === 'virtual'
                              ? 'Virtual'
                              : 'Mixto'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600 px-3">
                    Página {page} de {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Liquidación</h3>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Empleada:</span>
                      <p className="font-semibold text-gray-800">{selectedEmployeeName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Fecha/Hora:</span>
                      <p className="font-semibold text-gray-800">{liquidationDateTime}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
                    Servicios ({selectedSummaryServices.length})
                  </h4>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Turno</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Hora</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Servicio</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Cliente</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-600">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSummaryServices.map((svc) => (
                          <tr key={svc.appointment_id} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-gray-700">#{svc.appointment_number}</td>
                            <td className="px-3 py-2 text-gray-600">{formatDate(svc.date)}</td>
                            <td className="px-3 py-2 text-gray-600">{formatTime(svc.time)}</td>
                            <td className="px-3 py-2 text-gray-700">{svc.service_name}</td>
                            <td className="px-3 py-2 text-gray-700">{svc.client_name}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {formatCurrency(svc.commission_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-pink-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total a pagar:</span>
                    <span className="text-xl font-bold text-pink-600">{formatCurrency(selectedTotal)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Método de pago</h4>
                  <div className="flex gap-3 mb-4">
                    {['efectivo', 'virtual', 'mixto'].map((method) => (
                      <button
                        key={method}
                        onClick={() => handlePaymentMethodChange(method)}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors capitalize ${
                          paymentMethod === method
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'mixto' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Efectivo
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Virtual
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={virtualAmount}
                          onChange={(e) => setVirtualAmount(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2 text-right text-sm text-gray-500">
                        Suma: {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(virtualAmount) || 0))}
                        {(parseFloat(cashAmount) || 0) + (parseFloat(virtualAmount) || 0) !== selectedTotal && (
                          <span className="text-red-500 ml-2">
                            (debe ser {formatCurrency(selectedTotal)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={confirming}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmLiquidation}
                  disabled={confirming}
                  className="flex-1 px-4 py-2.5 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:bg-pink-400 transition-colors flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <>
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Confirmar Liquidación
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Liquidations;
