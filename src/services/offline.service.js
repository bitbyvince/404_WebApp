const DB_NAME = 'respiratrack-offline';
const STORE = 'writes';

const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transact = async (mode, action) => {
  if (!('indexedDB' in window)) throw new Error('Offline storage is unavailable in this browser.');
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = action(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(result?.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
};

const ownerId = () => {
  try {
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    if (admin._id || admin.id || admin.user_id) return String(admin._id || admin.id || admin.user_id);
    const token = localStorage.getItem('token');
    const payload = token?.split('.')[1];
    if (payload) {
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      if (claims.sub || claims.user_id || claims.id) return String(claims.sub || claims.user_id || claims.id);
    }
    return admin.role ? `${admin.role}:${admin.barangay_id || 'city'}` : '';
  } catch { return ''; }
};

export const queueOfflineWrite = async ({ url, method, body }) => {
  if (!ownerId()) throw new Error('Sign in while online before saving work offline.');
  const item = {
    id: crypto.randomUUID(), url, method, body,
    ownerId: ownerId(), createdAt: new Date().toISOString(),
  };
  await transact('readwrite', (store) => store.put(item));
  window.dispatchEvent(new Event('offline-queue-updated'));
  return item;
};

export const getOfflineQueueCount = async () => {
  if (!('indexedDB' in window)) return 0;
  const items = await transact('readonly', (store) => store.getAll());
  return (items || []).filter((item) => item.url && item.method && !item.id.startsWith('cache:')).length;
};

export const cacheOfflineRead = async (key, value) => {
  if (!ownerId()) return;
  await transact('readwrite', (store) => store.put({
    id: `cache:${ownerId()}:${key}`, ownerId: ownerId(), cachedValue: value,
  }));
};

export const getOfflineRead = async (key) => {
  if (!ownerId() || !('indexedDB' in window)) return null;
  const entry = await transact('readonly', (store) => store.get(`cache:${ownerId()}:${key}`));
  return entry?.cachedValue ?? null;
};

let syncing = false;
export const syncOfflineWrites = async () => {
  if (syncing || !navigator.onLine || !localStorage.getItem('token')) return;
  syncing = true;
  try {
    const items = await transact('readonly', (store) => store.getAll());
    const owner = ownerId();
    for (const item of (items || []).filter((entry) => entry.url && entry.method && !entry.id.startsWith('cache:'))) {
      // Never submit one user's saved clinical data under another account.
      if (item.ownerId !== owner) continue;
      let response;
      try {
        response = await fetch(item.url, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(item.body),
        });
      } catch { break; }
      if (response.status === 401 || response.status >= 500) break;
      // Keep rejected records visible for manual correction; remove successful writes only.
      if (response.ok) await transact('readwrite', (store) => store.delete(item.id));
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new Event('offline-queue-updated'));
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineWrites);
}
