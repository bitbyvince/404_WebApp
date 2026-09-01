import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchBarangays = async () => {
  const res = await authFetch(`${BASE_URL}/api/barangays`);
  return res.json();
};

export const createBarangayAdmin = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const createBarangay = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/barangays`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const createPatcAccount = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, role: 'patc' }),
  });
  return res.json();
};

export const createNurse = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const fetchNurses = async ({ barangay_id, page = 1, limit = 10 } = {}) => {
  const params = new URLSearchParams({ role: 'nurse', page, limit });
  if (barangay_id) params.set('barangay_id', barangay_id);

  const res = await authFetch(`${BASE_URL}/api/users/staff?${params}`);
  return res.json();
};

export const deactivateNurse = async (user_id) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff/${user_id}/deactivate`, {
    method: 'PATCH',
  });
  return res.json();
};

export const reactivateNurse = async (user_id) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff/${user_id}/reactivate`, {
    method: 'PATCH',
  });
  return res.json();
};

export const fetchInventoryByBarangay = async (barangay_id) => {
  const params = new URLSearchParams({ barangay_id });
  const res = await authFetch(`${BASE_URL}/api/inventory?${params}`);
  return res.json();
};