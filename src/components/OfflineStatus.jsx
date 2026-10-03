import { useEffect, useState } from 'react';
import { getOfflineQueueCount, syncOfflineWrites } from '../services/offline.service';

export default function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = async (attemptSync = true) => {
      setOnline(navigator.onLine);
      if (attemptSync && navigator.onLine) await syncOfflineWrites();
      try { setPending(await getOfflineQueueCount()); } catch { setPending(0); }
    };
    const refreshStatus = () => refresh(false);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    window.addEventListener('offline-queue-updated', refreshStatus);
    const retryTimer = window.setInterval(refresh, 15000);
    refresh();
    return () => {
      window.clearInterval(retryTimer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
      window.removeEventListener('offline-queue-updated', refreshStatus);
    };
  }, []);

  if (online && pending === 0) return null;
  return (
    <div role="status" className={`fixed bottom-4 right-4 z-[100] rounded-lg px-4 py-2 text-sm font-medium text-white shadow-lg ${online ? 'bg-amber-600' : 'bg-slate-800'}`}>
      {!online ? 'Offline' : `${pending} item${pending === 1 ? '' : 's'} waiting to sync`}
      {pending > 0 && <span className="ml-2 text-xs font-normal">Saved on this device</span>}
    </div>
  );
}
