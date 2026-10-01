export function sortMovements(rows) {
  return [...rows].sort((a, b) => (new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || String(b.id).localeCompare(String(a.id), 'en', { numeric: true }));
}

export function reasonLabel(reason) {
  return String(reason || 'Stock adjustment').replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

