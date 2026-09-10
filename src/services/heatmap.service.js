import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchHeatmap = async ({ period = "monthly", snapshot_date, barangay_id, health_center_id } = {}) => {
  const params = new URLSearchParams({ period });
  if (snapshot_date)    params.set('snapshot_date', snapshot_date);
  if (barangay_id)      params.set('barangay_id', barangay_id);
  if (health_center_id) params.set('health_center_id', health_center_id);

  const res = await authFetch(`${BASE_URL}/api/heatmap?${params}`);
  return res.json();
};

export const fetchHeatmapHistory = async (barangayId, { period = "monthly", from, to, limit = 12, health_center_id } = {}) => {
  const params = new URLSearchParams({ period, limit });
  if (from)             params.set('from', from);
  if (to)               params.set('to', to);
  if (health_center_id) params.set('health_center_id', health_center_id);

  const res = await authFetch(`${BASE_URL}/api/heatmap/barangays/${barangayId}/history?${params}`);
  return res.json();
};