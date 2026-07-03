export function formatTime(time) {
  if (!time) return '';
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
}

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-AR');
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
}

export function getStatusBadge(status) {
  const map = {
    solicitado: { label: 'Solicitado', class: 'badge-warning' },
    agendado: { label: 'Agendado', class: 'badge-info' },
    completado: { label: 'Completado', class: 'badge-success' },
    cancelado: { label: 'Cancelado', class: 'badge-danger' },
    liquidado: { label: 'Liquidado', class: 'badge-purple' },
  };
  return map[status] || { label: status, class: 'badge-info' };
}

export function getDayName(dayNum) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayNum] || '';
}

export function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
