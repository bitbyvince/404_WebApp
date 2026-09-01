const BASE_URL = import.meta.env.VITE_API_URL;
const getToken = () => localStorage.getItem('token');

export const fetchActivePatientsForDispensing = async (barangay_id) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  const res = await fetch(`${BASE_URL}/api/dispensing/patients/active?${params}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return res.json();
};

export const createDispensingRecord = async ({ patient_id, days_supplied, dispense_date, medicines, notes }) => {
  const res = await fetch(`${BASE_URL}/api/dispensing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ patient_id, days_supplied, dispense_date, medicines, notes }),
  });
  return res.json();
};

// ✅ New — used by the Dispensing Logs table
export const fetchDispensingRecords = async ({
  barangay_id,
  patient_id,
  drug_name,
  from_date,
  to_date,
  page = 1,
  limit = 10,
} = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (patient_id) params.set('patient_id', patient_id);
  if (drug_name) params.set('drug_name', drug_name);
  if (from_date) params.set('from_date', from_date);
  if (to_date) params.set('to_date', to_date);
  params.set('page', page);
  params.set('limit', limit);

  const res = await fetch(`${BASE_URL}/api/dispensing?${params}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return res.json();
};