import api from '../../services/api.js';
import React, { useState } from 'react';
export default function DesktopBackups() {
  const [busy, setBusy] = useState(false), [status, setStatus] = useState('');
  if (!window.opticsDesktop) return null;
  async function run(action) {
    setBusy(true); setStatus('Working… Please keep the app open.');
    try {
      await api.get('/auth/me');
      const result = await window.opticsDesktop[action](localStorage.getItem('optics_token'));
      setStatus(result.cancelled ? 'Cancelled.' : action === 'backup' ? 'Backup saved. Keep a copy on a separate drive.' : 'Backup restored. Restarting…');
    } catch (error) { setStatus('Could not complete the operation. ' + error.message); }
    finally { setBusy(false); }
  }
  return <section className="rounded-xl border bg-white p-5 space-y-3" aria-label="Desktop backups">
    <h2 className="text-lg font-semibold">Desktop backups</h2>
    <p className="text-sm">Records are stored on this computer. Automatic backups are kept locally; save a copy to a USB or other drive regularly.</p>
    <div className="flex gap-3"><button disabled={busy} type="button" className="rounded-lg bg-[#28766B] text-white px-4 py-2" onClick={() => run('backup')}>Save backup</button>
    <button disabled={busy} type="button" className="rounded-lg border px-4 py-2" onClick={() => run('restore')}>Restore backup</button></div>
    <p role="status" aria-live="polite" className="text-sm">{status}</p>
  </section>;
}
