function formatTime(time) {
  if (!time) return null;
  const str = String(time);
  const parts = str.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return str;
}

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateDni(dni) {
  return /^\d{7,10}$/.test(dni);
}

function validatePhone(phone) {
  return /^\+?\d{7,15}$/.test(phone);
}

function validateDuration(duration) {
  return duration > 0 && duration % 5 === 0;
}

function validateTime(time) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

function validateDayOfWeek(day) {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim();
}

module.exports = {
  formatTime,
  validateEmail,
  validateDni,
  validatePhone,
  validateDuration,
  validateTime,
  validateDayOfWeek,
  sanitizeString
};
