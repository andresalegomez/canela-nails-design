import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Database, Trash2, Plus, Search, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

export default function AdminDB() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [data, setData] = useState({ rows: [], total: 0, page: 1, totalPages: 1, columns: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    api.getDbTables().then(d => setTables(d.tables || d || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedTable) loadData();
  }, [selectedTable, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const d = await api.getDbTableData(selectedTable, { page, limit: 20, search });
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSearch = () => { setPage(1); loadData(); };

  const startEdit = (rowId, column, value) => {
    setEditingCell({ rowId, column });
    setEditValue(value === null || value === undefined ? '' : String(value));
  };

  const saveEdit = async (rowId) => {
    try {
      await api.updateDbRow(selectedTable, rowId, { [editingCell.column]: editValue });
      setEditingCell(null);
      loadData();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const deleteRow = async (rowId) => {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await api.deleteDbRow(selectedTable, rowId);
      loadData();
    } catch (e) { alert('Error: ' + e.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Database size={24} /> Gestión de Base de Datos</h1>

      <div className="flex gap-4 flex-wrap items-end">
        <div>
          <label className="label-field">Tabla</label>
          <select value={selectedTable} onChange={e => { setSelectedTable(e.target.value); setPage(1); setSearch(''); }} className="input-field w-64">
            <option value="">Seleccionar tabla...</option>
            {tables.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {selectedTable && (
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <Search size={16} className="text-gray-400" />
              <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} className="outline-none text-sm" />
            </div>
            <button onClick={handleSearch} className="btn-primary text-sm">Buscar</button>
          </div>
        )}
      </div>

      {selectedTable && (
        <div className="card overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
          ) : data.rows?.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Sin datos</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="table-header">
                  {(data.columns || Object.keys(data.rows?.[0] || {})).map(col => (
                    <th key={col} className="px-3 py-2 border border-gray-200 whitespace-nowrap">{col}</th>
                  ))}
                  <th className="px-3 py-2 border border-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row, ri) => (
                  <tr key={row.id || ri} className="hover:bg-gray-50">
                    {(data.columns || Object.keys(row)).filter(c => c !== 'password').map(col => (
                      <td key={col} className="px-3 py-2 border border-gray-200 whitespace-nowrap cursor-pointer hover:bg-yellow-50"
                        onClick={() => startEdit(row.id, col, row[col])}>
                        {editingCell?.rowId === row.id && editingCell?.column === col ? (
                          <div className="flex items-center gap-1">
                            <input value={editValue} onChange={e => setEditValue(e.target.value)}
                              className="w-full px-1 py-0.5 border border-brand-500 rounded text-xs" autoFocus
                              onKeyDown={e => { if (e.key === 'Enter') saveEdit(row.id); if (e.key === 'Escape') cancelEdit(); }} />
                            <button onClick={(e) => { e.stopPropagation(); saveEdit(row.id); }} className="text-green-600"><Save size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); cancelEdit(); }} className="text-red-600"><X size={14} /></button>
                          </div>
                        ) : (
                          <span className={row[col] === null ? 'text-gray-400 italic' : ''}>
                            {row[col] === null ? 'NULL' : typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 border border-gray-200">
                      <button onClick={() => deleteRow(row.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm text-gray-500">Página {data.page || page} de {data.totalPages || 1} | Total: {data.total || 0} registros</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary flex items-center gap-1 text-sm">
                <ChevronLeft size={16} /> Ant
              </button>
              <button onClick={() => setPage(p => Math.min(data.totalPages || 1, p + 1))} disabled={page >= (data.totalPages || 1)} className="btn-secondary flex items-center gap-1 text-sm">
                Sig <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}