import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

// This list is used as full reference data everywhere (health center
// picker dropdowns, transfer targets, the Health Centers overview) —
// never as a paginated table — so it must request every barangay, not
// rely on the backend's default page size (20), which silently
// dropped Pasig's last ~10 barangays.
//
// includeStats is opt-in: computing live patient stats costs 7 DB
// queries PER barangay on the backend, but only the Health Centers
// overview page actually displays them — every other caller here
// (dropdowns, transfer targets, patient forms) just needs id/name/
// health_centers, so leave it off unless you're rendering stats.
export const fetchBarangays = async ({ includeStats = false } = {}) => {
  const params = new URLSearchParams({ limit: "200" });
  if (includeStats) params.set("include_stats", "true");
  const res = await authFetch(`${BASE_URL}/api/barangays?${params}`);
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

export const addHealthCenter = async (barangayId, payload) => {
  const res = await authFetch(`${BASE_URL}/api/barangays/${barangayId}/health-centers`, {
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

export const updateNurse = async (user_id, payload) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff/${user_id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const deleteNurse = async (user_id) => {
  const res = await authFetch(`${BASE_URL}/api/users/staff/${user_id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const fetchInventoryByBarangay = async (barangay_id) => {
  const params = new URLSearchParams({ barangay_id });
  const res = await authFetch(`${BASE_URL}/api/inventory?${params}`);
  return res.json();
};