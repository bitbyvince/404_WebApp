import { authFetch } from './auth.service';


const BASE_URL = import.meta.env.VITE_API_URL;

export const fetchPatients = async ({ search, barangay_id, risk_level, treatment_phase, sex, min_age, max_age, from, to, page, limit }) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (risk_level) params.set('risk_level', risk_level);
  if (treatment_phase) params.set('treatment_phase', treatment_phase);
  if (sex) params.set('sex', sex);
  if (min_age !== undefined && min_age !== '') params.set('min_age', min_age);
  if (max_age !== undefined && max_age !== '') params.set('max_age', max_age);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('page', page);
  params.set('limit', limit);

  const res = await authFetch(`${BASE_URL}/api/patients?${params}`);
  return res.json();
};

export const registerPatient = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const fetchPatientById = async (patient_id) => {
  const res = await authFetch(`${BASE_URL}/api/patients/${patient_id}`);
  return res.json();
};

export const resetPatientPin = async (patient_id) => {
  const res = await authFetch(`${BASE_URL}/api/users/patients/${patient_id}/reset-pin`, {
    method: 'PATCH',
  });
  return res.json();
};

export const fetchEscalatedPatients = async (escalation_level = 3, barangay_id = null) => {
  const params = new URLSearchParams();
  params.set('escalation_level', escalation_level);
  params.set('limit', 100);
  if (barangay_id) params.set('barangay_id', barangay_id);

  const res = await authFetch(`${BASE_URL}/api/patients?${params}`);
  return res.json();
};

export const exportPatientsPdf = async ({ barangay_id, risk_level, treatment_phase, is_active, sex, min_age, max_age, from, to } = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (risk_level) params.set('risk_level', risk_level);
  if (treatment_phase) params.set('treatment_phase', treatment_phase);
  if (is_active !== undefined) params.set('is_active', is_active);
  if (sex) params.set('sex', sex);
  if (min_age !== undefined && min_age !== '') params.set('min_age', min_age);
  if (max_age !== undefined && max_age !== '') params.set('max_age', max_age);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await fetch(`${BASE_URL}/api/patients/export/pdf?${params}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || `Export failed with status ${res.status}`);
  }

  return res.blob();
};