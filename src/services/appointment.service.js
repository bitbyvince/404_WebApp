import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchBarangayAppointments = async (barangay_id, { status, purpose, date, from, to, sortDir } = {}) => {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (purpose) params.set('purpose', purpose);
  if (date) params.set('date', date);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (sortDir) params.set('sortDir', sortDir);

  const res = await authFetch(`${BASE_URL}/api/appointments/barangay/${barangay_id}?${params}`);
  return res.json();
};

export const fetchAllAppointments = async ({ status, purpose, from, to, barangay_id, sortDir, page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (purpose) params.set('purpose', purpose);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (sortDir) params.set('sortDir', sortDir);

  const res = await authFetch(`${BASE_URL}/api/appointments?${params}`);
  return res.json();
};

export const confirmAppointment = async (appointmentId) => {
  const res = await authFetch(`${BASE_URL}/api/appointments/${appointmentId}/confirm`, {
    method: 'PATCH',
  });
  return res.json();
};

export const completeAppointment = async (appointmentId) => {
  const res = await authFetch(`${BASE_URL}/api/appointments/${appointmentId}/complete`, {
    method: 'PATCH',
  });
  return res.json();
};

export const cancelAppointment = async (appointmentId, reason = '') => {
  const res = await authFetch(`${BASE_URL}/api/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancellation_reason: reason }),
  });
  return res.json();
};
