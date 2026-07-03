import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency, formatDate, formatTime } from '../../utils/helpers';
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('services');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [servicesData, setServicesData] = useState([]);
  const [cashData, setCashData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEmployees()
      .then(res => setEmployees(res.data || []))
      .catch(() => {});
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getReportServices({
        dateFrom,
        dateTo,
        employee_id: employeeId || undefined
      });
      setServicesData(res.data || []);
    } catch (e) {
      setError('Error al cargar reporte de servicios');
    } finally {
      setLoading(false);
    }
  };

  const fetchCash = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getReportCash({ dateFrom, dateTo });
      setCashData(res.data || []);
    } catch (e) {
      setError('Error al cargar reporte de caja');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'services') {
      fetchServices();
    } else {
      fetchCash();
    }
  };

  const exportExcel = async () => {
    try {
      const params = { dateFrom, dateTo };
      if (activeTab === 'services' && employeeId) {
        params.employee_id = employeeId;
      }
      const blob = await api.exportExcel(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError('Error al exportar');
    }
  };

  const cashTotals = cashData.reduce(
    (acc, item) => {
      const amt = Number(item.amount) || 0;
      if (item.type === 'ingreso') {
        acc.ingresos += amt;
      } else {
        acc.egresos += amt;
      }
      return acc;
    },
    { ingresos: 0, egresos: 0 }
  );
  cashTotals.balance = cashTotals.ingresos - cashTotals.egresos;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Reportes</h1>
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'services'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reportes de Servicios
        </button>
        <button
          onClick={() => setActiveTab('cash')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'cash'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Reportes de Caja
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          {activeTab === 'services' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empleado</label>
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Todos</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Buscar'}
          </button>
          <button
            onClick={exportExcel}
            disabled={loading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar a Excel
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {activeTab === 'services' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Nombre Apellido</th>
                  <th className="text-left px-3 py-2">DNI</th>
                  <th className="text-left px-3 py-2">Monto</th>
                  <th className="text-left px-3 py-2">Servicio</th>
                </tr>
              </thead>
              <tbody>
                {servicesData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  servicesData.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {formatDate(row.date)} {formatTime(row.time)}
                      </td>
                      <td className="px-3 py-2">
                        {row.name} {row.last_name}
                      </td>
                      <td className="px-3 py-2">{row.dni}</td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2">{row.service}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2">Fecha</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                  <th className="text-left px-3 py-2">Monto</th>
                  <th className="text-left px-3 py-2">Descripción</th>
                  <th className="text-left px-3 py-2">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {cashData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-gray-400">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  cashData.map((row, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        {formatDate(row.date)} {formatTime(row.time)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            row.type === 'ingreso'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2">{row.description}</td>
                      <td className="px-3 py-2">{row.reference}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {cashData.length > 0 && (
              <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t font-semibold text-sm">
                <span className="text-green-600">
                  Total Ingresos: {formatCurrency(cashTotals.ingresos)}
                </span>
                <span className="text-red-600">
                  Total Egresos: {formatCurrency(cashTotals.egresos)}
                </span>
                <span className={cashTotals.balance >= 0 ? 'text-green-700' : 'text-red-700'}>
                  Balance: {formatCurrency(cashTotals.balance)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
