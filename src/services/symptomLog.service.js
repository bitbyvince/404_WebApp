import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

// Scoping (own barangay/health center vs city-wide) is resolved
// server-side from the requester's role — pass barangay_id/
// health_center_id only when acting as super_admin/patc browsing a
// specific one.
export const fetchSymptomLogs = async ({
  barangay_id, health_center_id, from, to, severity, reviewed, page = 1, limit = 20,
} = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (barangay_id)      params.set('barangay_id', barangay_id);
  if (health_center_id) params.set('health_center_id', health_center_id);
  if (from)             params.set('from', from);
  if (to)               params.set('to', to);
  if (severity)         params.set('severity', severity);
  if (reviewed !== undefined && reviewed !== '') params.set('reviewed', reviewed);

  const res = await authFetch(`${BASE_URL}/api/symptom-logs?${params}`);
  return res.json();
};

export const reviewSymptomLog = async (logId) => {
  const res = await authFetch(`${BASE_URL}/api/symptom-logs/${logId}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  return res.json();
};

// Returns a PDF Blob — caller is responsible for triggering the download.
export const exportSymptomLogsPdf = async ({
  barangay_id, health_center_id, from, to, severity, reviewed,
} = {}) => {
  const params = new URLSearchParams();
  if (barangay_id)      params.set('barangay_id', barangay_id);
  if (health_center_id) params.set('health_center_id', health_center_id);
  if (from)             params.set('from', from);
  if (to)               params.set('to', to);
  if (severity)         params.set('severity', severity);
  if (reviewed !== undefined && reviewed !== '') params.set('reviewed', reviewed);

  const res = await authFetch(`${BASE_URL}/api/symptom-logs/export/pdf?${params}`);
  if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
  return res.blob();
};
