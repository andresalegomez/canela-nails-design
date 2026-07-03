import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate, formatTime } from '../../utils/helpers';
import { FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { loadLogs(); }, [page, actionFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs({ page, limit: 20, action: actionFilter });
      setLogs(data.logs || data || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 20) || 1);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const filtered = logs.filter(l => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (l.action || '').toLowerCase().includes(s) || (l.entity_type || '').toLowerCase().includes(s) || JSON.stringify(l.details || '').toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Historial de Eventos</h1>
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="outline-none text-sm" />
        </div>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="input-field w-auto">
          <option value="">Todas las acciones</option>
          <option value="appointment_created">Turno creado</option>
          <option value="appointment_cancelled">Turno cancelado</option>
          <option value="appointment_status_changed">Estado cambiado</option>
          <option value="payment_registered">Pago registrado</option>
          <option value="payment_reversed">Pago revertido</option>
          <option value="liquidation_created">Liquidación</option>
          <option value="cash_added">Dinero agregado a caja</option>
          <option value="cash_withdrawn">Dinero retirado de caja</option>
          <option value="service_created">Servicio creado</option>
          <option value="service_updated">Servicio editado</option>
        </select>
      </div>
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No hay registros</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Fecha/Hora</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">Detalles</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.created_at)} {formatTime(log.created_at)}</td>
                    <td className="px-4 py-3"><span className="badge-info">{log.action}</span></td>
                    <td className="px-4 py-3">{log.entity_type || '-'} {log.entity_id ? `#${String(log.entity_id).slice(0, 8)}` : ''}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{log.details ? JSON.stringify(log.details) : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary flex items-center gap-1 text-sm">
              <ChevronLeft size={16} /> Anterior
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary flex items-center gap-1 text-sm">
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}