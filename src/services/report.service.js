import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchCityReport = async ({ from, to } = {}) => {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await authFetch(`${BASE_URL}/api/reports/city?${params}`);
  return res.json();
};

export const fetchComplianceTrend = async ({ barangay_id, period, from, to, limit } = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (period) params.set('period', period);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', limit);

  const res = await authFetch(`${BASE_URL}/api/reports/compliance-trend?${params}`);
  return res.json();
};

export const fetchInventoryReport = async ({ barangay_id } = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);

  const res = await authFetch(`${BASE_URL}/api/reports/inventory?${params}`);
  return res.json();
};

export const fetchBarangayReport = async ({ barangay_id, from, to } = {}) => {
  const params = new URLSearchParams();

  if (barangay_id) params.set('barangay_id', barangay_id);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await authFetch(`${BASE_URL}/api/reports/barangay?${params}`);
  return res.json();
};

export const exportInventoryReportPdf = async ({ barangay_id } = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  params.set('format', 'pdf');

  const res = await fetch(`${BASE_URL}/api/reports/inventory?${params}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Export failed with status ${res.status}`);
  }

  return res.blob();
};