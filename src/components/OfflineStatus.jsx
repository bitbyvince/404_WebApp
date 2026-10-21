import { useEffect, useState } from 'react';
import { getOfflineQueueItems, syncOfflineWrites } from '../services/offline.service';

const getItemTitle = (item) => {
  const path = new URL(item.url, window.location.origin).pathname;
  if (path.endsWith('/api/patients')) return 'Patient registration';
  if (path.endsWith('/api/dispensing')) return 'Medicine dispensing record';
  return 'Saved submission';
};

const getItemSummary = (item) => {
  const body = item.body || {};
  if (getItemTitle(item) === 'Patient registration') {
    const name = [body.first_name, body.middle_name, body.last_name].filter(Boolean).join(' ');
    return name || 'Patient details';
  }
  if (getItemTitle(item) === 'Medicine dispensing record') {
    return `Patient ${body.patient_id || ''}${body.dispense_date ? ` · ${body.dispense_date}` : ''}`;
  }
  return new Date(item.createdAt).toLocaleString();
};

export default function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async (attemptSync = true) => {
      setOnline(navigator.onLine);
      if (attemptSync && navigator.onLine) {
        setSyncing(true);
        try { await syncOfflineWrites(); } finally { setSyncing(false); }
      }
      try {
        const queue = await getOfflineQueueItems();
        if (active) setItems(queue);
      } catch {
        if (active) setItems([]);
      }
    };
    const refreshStatus = () => refresh(false);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refreshStatus);
    window.addEventListener('offline-queue-updated', refreshStatus);
    const retryTimer = window.setInterval(() => refresh(), 15000);
    refresh();
    return () => {
      active = false;
      window.clearInterval(retryTimer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refreshStatus);
      window.removeEventListener('offline-queue-updated', refreshStatus);
    };
  }, []);

  if (online && items.length === 0) return null;
  const label = !online ? 'Offline' : syncing ? 'Syncing saved data…' : `${items.length} item${items.length === 1 ? '' : 's'} waiting to sync`;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-[min(26rem,calc(100vw-2rem))]">
      {open && items.length > 0 && (
        <section aria-label="Pending sync items" className="mb-3 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Saved on this device</h2>
              <p className="text-xs text-slate-500">These submissions have not been confirmed by the server.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close pending sync panel" className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
          </div>
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{getItemTitle(item)}</p>
                    <p className="truncate text-xs text-slate-600">{getItemSummary(item)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${item.syncState === 'needs_attention' ? 'bg-red-100 text-red-700' : item.syncState === 'syncing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
                    {item.syncState === 'needs_attention' ? 'Needs attention' : item.syncState === 'syncing' ? 'Syncing' : 'Waiting'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">Saved {new Date(item.createdAt).toLocaleString()}</p>
                {item.lastError && <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-800">{item.lastError}</p>}
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-blue-700">View saved data</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-[10px] text-slate-700">{JSON.stringify(item.body, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`ml-auto block rounded-lg px-4 py-2 text-left text-sm font-medium text-white shadow-lg ${online ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'}`}
      >
        {label}{items.length > 0 && <span className="ml-2 text-xs font-normal">View saved data</span>}
      </button>
    </div>
  );
}
