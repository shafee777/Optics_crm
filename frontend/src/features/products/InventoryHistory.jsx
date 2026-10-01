import React, { useEffect, useState } from 'react';
import api from '../../services/api.js';

import { sortMovements, reasonLabel } from '../../lib/inventoryHistory.js';

export default function InventoryHistory({ product, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setRows([]);
    api.get(`/products/${product.id}/movements`).then(res => {
      if (active) setRows(sortMovements(res.data.data));
    }).catch(() => {
      if (active) setError('Could not load stock history. Please try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product.id, retry]);
  return <section aria-label="Inventory movement history" className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
    <div className="flex justify-between items-start gap-3">
      <div className="min-w-0"><h2 className="font-semibold break-words">Stock history: {product.name}</h2><p className="text-xs text-slate-500">Most recent 200 movements · newest first</p></div>
      <button type="button" onClick={onClose} className="text-xs underline shrink-0">Close history</button>
    </div>
    {loading ? <p role="status" className="text-sm text-slate-500">Loading stock history…</p> : error ? <div role="alert" className="p-3 bg-rose-50 text-rose-800 rounded-xl text-sm">{error} <button onClick={() => setRetry(n => n + 1)} className="underline font-semibold">Retry</button></div> : rows.length === 0 ? <p className="text-sm text-slate-500">No stock movements recorded yet.</p> :
      <ol className="divide-y divide-slate-100">{rows.map(row => {
        const change = Number(row.quantity_change);
        return <li key={row.id} className="py-3 grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2 sm:gap-4 text-sm">
          <time dateTime={row.created_at} className="text-slate-600 tabular-nums">{new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time>
          <div className="min-w-0"><span className={`inline-block px-2 py-0.5 rounded-full font-bold tabular-nums ${change > 0 ? 'bg-emerald-50 text-emerald-800' : change < 0 ? 'bg-rose-50 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{change > 0 ? 'IN +' : change < 0 ? 'OUT ' : 'NO CHANGE '}{change}</span><p className="mt-1 break-words text-slate-700">{reasonLabel(row.reason)}</p>{row.reference && <p className="break-words text-xs text-slate-500">Ref: {row.reference}</p>}</div>
          <div className="sm:text-right text-slate-500 text-xs">Stock balance<strong className="ml-2 sm:block sm:ml-0 text-sm text-slate-900 tabular-nums">{row.balance_after}</strong></div>
        </li>;
      })}</ol>}
  </section>;
}
