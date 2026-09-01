import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchStockRequestAlerts = async () => {
  const res = await authFetch(`${BASE_URL}/api/alerts?alert_type=${encodeURIComponent('Stock Request')}&limit=50`, {
    method: 'GET',
    cache: 'no-store',
  });
  return res.json();
};

export const acknowledgeAlert = async (alertId) => {
  const res = await authFetch(`${BASE_URL}/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' });
  return res.json();
};

export const resolveAlert = async (alertId, notes = '') => {
  const res = await authFetch(`${BASE_URL}/api/alerts/${alertId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return res.json();
};