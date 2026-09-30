export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function isValidDateOrIso(val) {
  if (!val || typeof val !== 'string') return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return isValidCalendarDate(val);
  }
  const time = Date.parse(val);
  return !isNaN(time);
}
