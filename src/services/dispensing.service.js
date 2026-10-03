import { cacheOfflineRead, getOfflineRead, queueOfflineWrite } from './offline.service';

const BASE_URL = import.meta.env.VITE_API_URL;
const getToken = () => localStorage.getItem('token');

export const fetchActivePatientsForDispensing = async (barangay_id) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  const cacheKey = `dispensing-patients:${barangay_id || 'all'}`;
  try {
    const res = await fetch(`${BASE_URL}/api/dispensing/patients/active?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) await cacheOfflineRead(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getOfflineRead(cacheKey);
    if (cached) return cached;
    throw error;
  }
};

export const createDispensingRecord = async ({ patient_id, days_supplied, dispense_date, medicines, notes }) => {
  const url = `${BASE_URL}/api/dispensing`;
  const body = { patient_id, days_supplied, dispense_date, medicines, notes };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (error) {
    if (error instanceof TypeError || !navigator.onLine) {
      await queueOfflineWrite({ url, method: 'POST', body });
      return { success: true, queued: true, message: 'Dispensing record saved on this device and will sync when internet returns.' };
    }
    throw error;
  }
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

  const cacheKey = `dispensing-records:${params.toString()}`;
  try {
    const res = await fetch(`${BASE_URL}/api/dispensing?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (res.ok) await cacheOfflineRead(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getOfflineRead(cacheKey);
    if (cached) return cached;
    throw error;
  }
};
