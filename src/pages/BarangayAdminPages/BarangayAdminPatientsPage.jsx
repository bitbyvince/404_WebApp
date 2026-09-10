import { useState, useEffect, useCallback } from "react";
// AFTER
import { fetchPatients, fetchPatientById, resetPatientPin, exportPatientsPdf, updatePatient, transferPatient, deactivatePatient, reactivatePatient } from "../../services/patient.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const badge = (type) => {
  if (type === "Compliant") return "bg-green-100 text-green-700";
  if (type === "At Risk")   return "bg-yellow-100 text-yellow-700";
  if (type === "Defaulter") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-700";
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const toDateInputValue = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
};

const formatPhone = (val) => {
  if (val.startsWith('09')) return '+63' + val.slice(1);
  return val;
};

const formatPhilHealth = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length >= 2) v = v.slice(0, 2) + '-' + v.slice(2);
  if (v.length >= 12) v = v.slice(0, 12) + '-' + v.slice(12, 13);
  return v;
};

const OTHER_DRUGS = ['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'];

const EMPTY_EDIT_FORM = {
  last_name: '', first_name: '', middle_name: '',
  birth_date: '', age: '', sex: '',
  weight_kg: '', height_cm: '',
  philhealth_number: '', phone_number: '', email: '',
  assigned_nurse_id: '',
  diagnosis: '', date_of_diagnosis: '',
  classification: '', bacteriological_status: '',
  patient_type: { is_new: true, is_retreatment: false, is_drug_susceptible: true, is_drug_resistant: false },
  treatment_phase: '', location_of_treatment: '',
  date_started: '', dat_support: '', regimen_type: '',
  drug_regimen: [{ drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }],
  treatment_supporter: { name: '', contact: '' },
  contact_tracing: { contacts: [{ name: '' }], schedule: '' },
  additional_notes: '',
};



const PatientsPanel = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [resetPinResult, setResetPinResult] = useState(null);
  const [resetPinLoading, setResetPinLoading] = useState(false);

  const [barangays, setBarangays] = useState([]);

  const [editingPatientId, setEditingPatientId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const [transferTarget, setTransferTarget] = useState(null);
  const [transferBarangayId, setTransferBarangayId] = useState('');
  const [transferHealthCenterId, setTransferHealthCenterId] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');

  const [deletingPatient, setDeletingPatient] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-xs text-zinc-600 font-medium";

  const handleView = async (patientId) => {
    setViewLoading(true);
    try {
      const data = await fetchPatientById(patientId);
      if (data.success) setSelectedPatient(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleResetPin = async (patientId) => {
    setResetPinLoading(true);
    try {
      const data = await resetPatientPin(patientId);
      if (data.success) {
        setResetPinResult(data.data?.newPin);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetPinLoading(false);
    }
  };

  const populateEditForm = (p) => {
    setEditingPatientId(p.patient_id);
    setEditForm({
      last_name: p.last_name || '', first_name: p.first_name || '', middle_name: p.middle_name || '',
      birth_date: toDateInputValue(p.birth_date), age: p.age ?? '', sex: p.sex || '',
      weight_kg: p.weight_kg ?? '', height_cm: p.height_cm ?? '',
      philhealth_number: p.philhealth_number || '', phone_number: p.phone_number || '', email: p.email || '',
      assigned_nurse_id: p.assigned_nurse_id || '',
      diagnosis: p.diagnosis || '', date_of_diagnosis: toDateInputValue(p.date_of_diagnosis),
      classification: p.classification || '', bacteriological_status: p.bacteriological_status || '',
      patient_type: p.patient_type || EMPTY_EDIT_FORM.patient_type,
      treatment_phase: p.treatment_phase || '', location_of_treatment: p.location_of_treatment || '',
      date_started: toDateInputValue(p.date_started), dat_support: p.dat_support || '', regimen_type: p.regimen_type || '',
      drug_regimen: p.drug_regimen?.length ? p.drug_regimen : EMPTY_EDIT_FORM.drug_regimen,
      treatment_supporter: { name: p.treatment_supporter?.name || '', contact: p.treatment_supporter?.contact || '' },
      contact_tracing: {
        contacts: p.contact_tracing?.contact_names?.length
          ? p.contact_tracing.contact_names.map(n => ({ name: n }))
          : [{ name: '' }],
        schedule: toDateInputValue(p.contact_tracing?.schedule),
      },
      additional_notes: p.additional_notes || '',
    });
    setEditError('');
  };

  const handleEditFormChange = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));
  const handleEditPatientTypeChange = (field, value) => setEditForm(prev => {
    const patientType = { ...prev.patient_type, [field]: value };
    if (value && field === 'is_new') patientType.is_retreatment = false;
    if (value && field === 'is_retreatment') patientType.is_new = false;
    return { ...prev, patient_type: patientType };
  });
  const handleEditDrugChange = (index, field, value) => {
    const updated = [...editForm.drug_regimen];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'drug_name') updated[index].strength = '';
    setEditForm(prev => ({ ...prev, drug_regimen: updated }));
  };
  const addEditDrug = () => setEditForm(prev => ({ ...prev, drug_regimen: [...prev.drug_regimen, { drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }] }));
  const removeEditDrug = (index) => setEditForm(prev => ({ ...prev, drug_regimen: prev.drug_regimen.filter((_, i) => i !== index) }));

  const handleEditContactChange = (index, value) => {
    setEditForm(prev => {
      const contacts = [...prev.contact_tracing.contacts];
      contacts[index] = { ...contacts[index], name: value };
      return { ...prev, contact_tracing: { ...prev.contact_tracing, contacts } };
    });
  };
  const addEditContact = () => setEditForm(prev => ({
    ...prev,
    contact_tracing: { ...prev.contact_tracing, contacts: [...prev.contact_tracing.contacts, { name: '' }] },
  }));
  const removeEditContact = (index) => setEditForm(prev => ({
    ...prev,
    contact_tracing: { ...prev.contact_tracing, contacts: prev.contact_tracing.contacts.filter((_, i) => i !== index) },
  }));

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        ...editForm,
        age: parseInt(editForm.age),
        weight_kg: editForm.weight_kg !== '' ? parseFloat(editForm.weight_kg) : null,
        height_cm: editForm.height_cm !== '' ? parseFloat(editForm.height_cm) : null,
        contact_tracing: {
          number_of_contacts: editForm.contact_tracing.contacts.length,
          contact_names: editForm.contact_tracing.contacts.map(c => c.name),
          schedule: editForm.contact_tracing.schedule || null,
        },
        drug_regimen: editForm.drug_regimen.map(d => ({ ...d, number_to_be_taken: parseInt(d.number_to_be_taken) })),
        treatment_supporter: { name: editForm.treatment_supporter.name || null, contact: editForm.treatment_supporter.contact || null },
        philhealth_number: editForm.philhealth_number || null,
        email: editForm.email || null,
        assigned_nurse_id: editForm.assigned_nurse_id || null,
        additional_notes: editForm.additional_notes || '',
      };
      const data = await updatePatient(editingPatientId, payload);
      if (data.success) {
        setEditingPatientId(null);
        loadPatients(search, filters, page);
      } else {
        setEditError(data.message || 'Failed to update patient.');
      }
    } catch (err) {
      setEditError('Connection error.');
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const data = await deactivatePatient(deletingPatient.patient_id);
      if (data.success) {
        setDeletingPatient(null);
        loadPatients(search, filters, page);
      } else {
        setDeleteError(data.message || 'Failed to delete patient.');
      }
    } catch (err) {
      setDeleteError('Connection error.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestore = async (patientId) => {
    setRestoringId(patientId);
    try {
      await reactivatePatient(patientId);
      loadPatients(search, filters, page);
    } catch (err) {
      console.error('Failed to restore patient:', err);
    } finally {
      setRestoringId(null);
    }
  };

  const handleTransferSubmit = async () => {
    setTransferLoading(true);
    setTransferError('');
    try {
      const target = barangays.find(b => b.barangay_id === transferBarangayId);
      const targetCenter = (target?.health_centers || []).find(
        hc => hc.health_center_id === transferHealthCenterId
      );
      if (!target || !targetCenter) {
        setTransferError('Please select a destination health center.');
        setTransferLoading(false);
        return;
      }
      const data = await transferPatient(transferTarget.patient_id, {
        barangay_id: target.barangay_id,
        barangay_name: target.name,
        health_center_id: targetCenter.health_center_id,
        health_center_name: targetCenter.name,
      });
      if (data.success) {
        setTransferTarget(null);
        setTransferBarangayId('');
        setTransferHealthCenterId('');
        loadPatients(search, filters, page);
      } else {
        setTransferError(data.message || 'Failed to transfer patient.');
      }
    } catch (err) {
      setTransferError('Connection error.');
    } finally {
      setTransferLoading(false);
    }
  };

  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filters, setFilters]   = useState({ risk_level: '', treatment_phase: '', sex: '', min_age: '', max_age: '', from: '', to: '' });
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [exportingPdf, setExportingPdf] = useState(false);
  const limit = 20;

  const admin        = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id  = admin.barangay_id;

  const loadPatients = useCallback(async (searchValue = '', activeFilters = {}, currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPatients({
        search: searchValue,
        barangay_id,
        ...activeFilters,
        page: currentPage,
        limit,
      });
      if (data.success) {
        setPatients(data.data?.patients || []);
        setTotal(data.data?.total || 0);
      } else {
        setError(data.message || 'Failed to load patients.');
      }
    } catch (err) {
      setError('Connection error.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [barangay_id]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPatients(search, filters, page);
    }, search ? 500 : 0);
    return () => clearTimeout(timeout);
  }, [search, filters, page, loadPatients]);

  useEffect(() => {
    const loadBarangays = async () => {
      try {
        const data = await fetchBarangays();
        if (data.success) setBarangays(data.barangays || []);
      } catch (err) {
        console.error('Failed to fetch barangays:', err);
      }
    };
    loadBarangays();
  }, []);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ risk_level: '', treatment_phase: '', sex: '', min_age: '', max_age: '', from: '', to: '' });
    setPage(1);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportPatientsPdf({
        barangay_id,
        risk_level: filters.risk_level || undefined,
        treatment_phase: filters.treatment_phase || undefined,
        sex: filters.sex || undefined,
        min_age: filters.min_age || undefined,
        max_age: filters.max_age || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export patients PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = search || filters.risk_level || filters.treatment_phase ||
    filters.sex || filters.min_age || filters.max_age || filters.from || filters.to;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500">Manage your barangay patients</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-blue-300"
        >
          {exportingPdf ? 'Exporting...' : '⬇ Export PDF'}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, TB case number, or patient ID..."
          className="w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="flex gap-3 flex-wrap">
          <select
            value={filters.risk_level}
            onChange={(e) => handleFilterChange('risk_level', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">All Risk Levels</option>
            <option value="Compliant">Compliant</option>
            <option value="At Risk">At Risk</option>
            <option value="Defaulter">Defaulter</option>
          </select>
          <select
            value={filters.treatment_phase}
            onChange={(e) => handleFilterChange('treatment_phase', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">All Phases</option>
            <option value="Intensive">Intensive</option>
            <option value="Continuation">Continuation</option>
          </select>
          <select
            value={filters.sex}
            onChange={(e) => handleFilterChange('sex', e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="">All Sexes</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input type="number" min={0} placeholder="Min Age" value={filters.min_age} onChange={(e) => handleFilterChange('min_age', e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm outline-none" />
          <input type="number" min={0} placeholder="Max Age" value={filters.max_age} onChange={(e) => handleFilterChange('max_age', e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm outline-none" />
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Registered
            <input type="date" value={filters.from} onChange={(e) => handleFilterChange('from', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none" />
            to
            <input type="date" value={filters.to} onChange={(e) => handleFilterChange('to', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none" />
          </label>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["TB Case No.", "Last Name", "First Name", "Middle Name", "Birthdate", "Age", "Sex", "Health Facility", "Anatomical Site", "Bacteriologic Status", "Date of Screening", "Date Started Tx.", "Risk", "Status", "Actions"].map(h => (
                <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="p-6 text-center text-gray-400">Loading patients...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={15} className="p-6 text-center text-gray-400">No patients found.</td></tr>
            ) : patients.map((p, i) => (
              <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                <td className="p-3 font-mono text-xs text-gray-700 whitespace-nowrap">{p.tb_case_number ?? '—'}</td>
                <td className="p-3 font-semibold text-gray-700">{p.last_name ?? '—'}</td>
                <td className="p-3 text-gray-700">{p.first_name ?? '—'}</td>
                <td className="p-3 text-gray-600">{p.middle_name || '—'}</td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.birth_date)}</td>
                <td className="p-3 text-gray-600">{p.age ?? '—'}</td>
                <td className="p-3 text-gray-600">{p.sex ?? '—'}</td>
                <td className="p-3 text-gray-600">{p.health_center_name ?? '—'}</td>
                <td className="p-3 text-gray-600">{p.classification ?? '—'}</td>
                <td className="p-3 text-gray-600">{p.bacteriological_status ?? '—'}</td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.date_of_diagnosis)}</td>
                <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.date_started)}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${badge(p.compliance?.risk_level)}`}>
                    {p.compliance?.risk_level ?? '—'}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td
                  className="p-3 text-blue-600 cursor-pointer font-medium hover:underline whitespace-nowrap"
                  onClick={() => handleView(p.patient_id)}
                >
                  {viewLoading ? '...' : 'View'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} patients</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded border text-sm ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedPatient && (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}</h2>
              <p className="text-xs text-gray-400 font-mono mt-1">{selectedPatient.tb_case_number}</p>
            </div>
            <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Close</button>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${selectedPatient.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {selectedPatient.is_active ? 'Active' : 'Inactive'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => { populateEditForm(selectedPatient); setSelectedPatient(null); setResetPinResult(null); }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              >
                Edit
              </button>
              <button
                onClick={() => { setTransferTarget(selectedPatient); setTransferBarangayId(''); setTransferError(''); setSelectedPatient(null); setResetPinResult(null); }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
              >
                Transfer
              </button>
              {selectedPatient.is_active ? (
                <button
                  onClick={() => { setDeletingPatient(selectedPatient); setDeleteError(''); setSelectedPatient(null); setResetPinResult(null); }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition"
                >
                  Delete
                </button>
              ) : (
                <button
                  onClick={() => { handleRestore(selectedPatient.patient_id); setSelectedPatient(null); setResetPinResult(null); }}
                  disabled={restoringId === selectedPatient.patient_id}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-green-50 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
                >
                  {restoringId === selectedPatient.patient_id ? 'Restoring...' : 'Restore'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-blue-700 mb-3">📱 Mobile App Credentials</p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-gray-500">Patient ID</p>
                <p className="font-bold text-gray-800 font-mono">{selectedPatient.patient_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone Number (login)</p>
                <p className="font-bold text-gray-800">{selectedPatient.phone_number ?? '—'}</p>
              </div>
            </div>
            {resetPinResult && (
              <div className="bg-white rounded-lg px-3 py-2 border border-blue-200 mb-3 flex justify-between items-center">
                <span className="text-xs text-gray-500">New PIN</span>
                <span className="text-xl font-bold text-blue-600 tracking-widest">{resetPinResult}</span>
              </div>
            )}
            <button
              onClick={() => { setResetPinResult(null); handleResetPin(selectedPatient.patient_id); }}
              disabled={resetPinLoading}
              className="w-full py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition disabled:opacity-50"
            >
              {resetPinLoading ? 'Resetting...' : 'Reset PIN'}
            </button>
            {resetPinResult && (
              <p className="text-xs text-gray-400 mt-2 text-center">Give this new PIN to the patient. It won't be shown again.</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-3">Personal Information</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Age</p><p className="text-gray-800">{selectedPatient.age ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Sex</p><p className="text-gray-800">{selectedPatient.sex ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Birthday</p><p className="text-gray-800">{formatDate(selectedPatient.birth_date)}</p></div>
              <div><p className="text-xs text-gray-400">Weight</p><p className="text-gray-800">{selectedPatient.weight_kg != null ? `${selectedPatient.weight_kg} kg` : '—'}</p></div>
              <div><p className="text-xs text-gray-400">Height</p><p className="text-gray-800">{selectedPatient.height_cm != null ? `${selectedPatient.height_cm} cm` : '—'}</p></div>
              <div><p className="text-xs text-gray-400">PhilHealth</p><p className="text-gray-800">{selectedPatient.philhealth_number ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Email</p><p className="text-gray-800">{selectedPatient.email ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Health Center</p><p className="text-gray-800">{selectedPatient.health_center_name ?? '—'}</p></div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-blue-700 mb-3">Diagnosis & Treatment</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Diagnosis</p><p className="text-gray-800">{selectedPatient.diagnosis ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Classification</p><p className="text-gray-800">{selectedPatient.classification ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Bacteriological Status</p><p className="text-gray-800">{selectedPatient.bacteriological_status ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Treatment Phase</p><p className="text-gray-800">{selectedPatient.treatment_phase ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Date Started</p><p className="text-gray-800">{formatDate(selectedPatient.date_started)}</p></div>
              <div><p className="text-xs text-gray-400">End Date</p><p className="text-gray-800">{formatDate(selectedPatient.end_date)}</p></div>
              <div><p className="text-xs text-gray-400">DAT Support</p><p className="text-gray-800">{selectedPatient.dat_support ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Regimen</p><p className="text-gray-800">{selectedPatient.regimen_type ?? '—'}</p></div>
              <div><p className="text-xs text-gray-400">Location</p><p className="text-gray-800">{selectedPatient.location_of_treatment ?? '—'}</p></div>
              <div>
                <p className="text-xs text-gray-400">Risk Level</p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${badge(selectedPatient.compliance?.risk_level)}`}>
                  {selectedPatient.compliance?.risk_level ?? '—'}
                </span>
              </div>
            </div>
          </div>

          {selectedPatient.drug_regimen?.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-3">Drug Regimen</p>
              <div className="space-y-2">
                {selectedPatient.drug_regimen.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <span className="font-medium text-gray-700">{d.drug_name}</span>
                    <span className="text-gray-500">{d.strength} — {d.number_to_be_taken} {d.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(selectedPatient.treatment_supporter?.name || selectedPatient.treatment_supporter?.contact) && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-3">Treatment Supporter</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Name</p><p className="text-gray-800">{selectedPatient.treatment_supporter.name ?? '—'}</p></div>
                <div><p className="text-xs text-gray-400">Contact</p><p className="text-gray-800">{selectedPatient.treatment_supporter.contact ?? '—'}</p></div>
              </div>
            </div>
          )}

          {selectedPatient.additional_notes && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-2">Notes</p>
              <p className="text-sm text-gray-600">{selectedPatient.additional_notes}</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>
        </div>
      </div>
    )}

      {/* Edit Patient Modal */}
      {editingPatientId && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Edit Patient</h2>
              <button onClick={() => setEditingPatientId(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {editError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{editError}</div>}

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>First Name *</label><input className={inputClass} value={editForm.first_name} onChange={e => handleEditFormChange('first_name', e.target.value)} required /></div>
                  <div><label className={labelClass}>Last Name *</label><input className={inputClass} value={editForm.last_name} onChange={e => handleEditFormChange('last_name', e.target.value)} required /></div>
                  <div className="col-span-2"><label className={labelClass}>Middle Name</label><input className={inputClass} value={editForm.middle_name} onChange={e => handleEditFormChange('middle_name', e.target.value)} /></div>
                  <div><label className={labelClass}>Age *</label><input type="number" className={inputClass} value={editForm.age} onChange={e => handleEditFormChange('age', e.target.value)} required /></div>
                  <div>
                    <label className={labelClass}>Sex *</label>
                    <select className={inputClass} value={editForm.sex} onChange={e => handleEditFormChange('sex', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Birthday *</label><input type="date" className={inputClass} value={editForm.birth_date} onChange={e => handleEditFormChange('birth_date', e.target.value)} required /></div>
                  <div><label className={labelClass}>Weight (kg)</label><input type="number" min={0} step="0.1" className={inputClass} value={editForm.weight_kg} onChange={e => handleEditFormChange('weight_kg', e.target.value)} /></div>
                  <div><label className={labelClass}>Height (cm)</label><input type="number" min={0} step="0.1" className={inputClass} value={editForm.height_cm} onChange={e => handleEditFormChange('height_cm', e.target.value)} /></div>
                  <div>
                    <label className={labelClass}>Phone Number * (e.g. 09171234567)</label>
                    <input className={inputClass} placeholder="09171234567 or +639XXXXXXXXX" value={editForm.phone_number} onChange={e => handleEditFormChange('phone_number', formatPhone(e.target.value))} required />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>PhilHealth No. (format: 12-123456789-0)</label>
                    <input className={inputClass} placeholder="12-123456789-0" value={editForm.philhealth_number} onChange={e => handleEditFormChange('philhealth_number', formatPhilHealth(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Diagnosis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Diagnosis *</label>
                    <select className={inputClass} value={editForm.diagnosis} onChange={e => handleEditFormChange('diagnosis', e.target.value)} required>
                      <option value="">Select diagnosis</option>
                      <option value="Pulmonary TB">Pulmonary TB</option>
                      <option value="Extra-pulmonary TB">Extra-pulmonary TB</option>
                      <option value="Drug-resistant TB">Drug-resistant TB</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Diagnosis & Start *</label>
                    <input type="date" className={inputClass} value={editForm.date_of_diagnosis} onChange={e => { handleEditFormChange('date_of_diagnosis', e.target.value); handleEditFormChange('date_started', e.target.value); }} required />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">TB Classification</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelClass}>Classification *</label>
                    <select className={inputClass} value={editForm.classification} onChange={e => handleEditFormChange('classification', e.target.value)} required>
                      <option value="">Pulmonary or Extra-pulmonary</option>
                      <option value="Pulmonary">Pulmonary</option>
                      <option value="Extra-pulmonary">Extra-pulmonary</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Bacteriological Status *</label>
                    <select className={inputClass} value={editForm.bacteriological_status} onChange={e => handleEditFormChange('bacteriological_status', e.target.value)} required>
                      <option value="">Select status</option>
                      <option value="Bacteriologically Confirmed">Bacteriologically Confirmed</option>
                      <option value="Clinically Diagnosed">Clinically Diagnosed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-6 flex-wrap">
                  {[
                    { field: 'is_new', label: 'New' },
                    { field: 'is_retreatment', label: 'Retreatment' },
                    { field: 'is_drug_susceptible', label: 'Drug-susceptible' },
                    { field: 'is_drug_resistant', label: 'Drug-resistant' },
                  ].map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={editForm.patient_type[field]} onChange={e => handleEditPatientTypeChange(field, e.target.checked)} className="w-4 h-4 rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Treatment Phase *</label>
                    <select className={inputClass} value={editForm.treatment_phase} onChange={e => handleEditFormChange('treatment_phase', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="Intensive">Intensive</option>
                      <option value="Continuation">Continuation</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location of Treatment *</label>
                    <select className={inputClass} value={editForm.location_of_treatment} onChange={e => handleEditFormChange('location_of_treatment', e.target.value)} required>
                      <option value="">Select location</option>
                      <option value="Health Facility">Health Facility</option>
                      <option value="Community">Community</option>
                      <option value="Home">Home</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>DAT Support *</label>
                    <select className={inputClass} value={editForm.dat_support} onChange={e => handleEditFormChange('dat_support', e.target.value)} required>
                      <option value="">Select DAT support</option>
                      <option value="Direct Observed Treatment">Direct Observed Treatment</option>
                      <option value="Video-observed Treatment">Video-observed Treatment</option>
                      <option value="Self-administered">Self-administered</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Regimen Type *</label>
                    <input className={inputClass} placeholder="e.g. 2HRZE/4HR" value={editForm.regimen_type} onChange={e => handleEditFormChange('regimen_type', e.target.value)} required />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Drug Regimen</h3>
                {editForm.drug_regimen.map((drug, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-blue-600">Drug {index + 1}</span>
                      {editForm.drug_regimen.length > 1 && (
                        <button type="button" onClick={() => removeEditDrug(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Drug Name</label>
                        <select className={inputClass} value={['', 'HRZE', 'HR'].includes(drug.drug_name) ? drug.drug_name : 'Others'} onChange={e => handleEditDrugChange(index, 'drug_name', e.target.value)} required>
                          <option value="">Drug Name</option>
                          <option value="HRZE">HRZE</option>
                          <option value="HR">HR</option>
                          <option value="Others">Others</option>
                        </select>
                        {!['', 'HRZE', 'HR'].includes(drug.drug_name) && (
                          <select className={`${inputClass} mt-2`} value={['Isoniazid', 'Rifampicin', 'Pyrazinamide', 'Ethambutol'].includes(drug.drug_name) ? drug.drug_name : ''} onChange={e => handleEditDrugChange(index, 'drug_name', e.target.value)} required>
                            <option value="">Select medicine</option>
                            <option value="Isoniazid">Isoniazid</option>
                            <option value="Rifampicin">Rifampicin</option>
                            <option value="Pyrazinamide">Pyrazinamide</option>
                            <option value="Ethambutol">Ethambutol</option>
                          </select>
                        )}
                      </div>
                      {OTHER_DRUGS.includes(drug.drug_name) && (
                        <div><label className={labelClass}>Strength</label><input className={inputClass} placeholder="e.g. 300mg" value={drug.strength} onChange={e => handleEditDrugChange(index, 'strength', e.target.value)} required /></div>
                      )}
                      <div>
                        <label className={labelClass}>Unit</label>
                        <select className={inputClass} value={drug.unit} onChange={e => handleEditDrugChange(index, 'unit', e.target.value)}>
                          <option value="tablet">Tablet</option>
                          <option value="capsule">Capsule</option>
                          <option value="vial">Vial</option>
                          <option value="sachet">Sachet</option>
                        </select>
                      </div>
                      <div><label className={labelClass}>Qty</label><input type="number" className={inputClass} placeholder="Qty" min={1} value={drug.number_to_be_taken} onChange={e => handleEditDrugChange(index, 'number_to_be_taken', e.target.value)} required /></div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addEditDrug} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
                  ⊕ Add Drug
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Supporter</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Supporter Name</label>
                    <input className={inputClass} value={editForm.treatment_supporter.name} onChange={e => setEditForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, name: e.target.value } }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Supporter Contact (e.g. 09171234567)</label>
                    <input
                      className={inputClass}
                      placeholder="09171234567 or +639XXXXXXXXX"
                      value={editForm.treatment_supporter.contact}
                      onChange={e => {
                        const val = formatPhone(e.target.value);
                        setEditForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, contact: val } }));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Contact Tracing</h3>
                <div>
                  <label className={labelClass}>Contact Tracing Schedule</label>
                  <input type="date" className={`${inputClass} mb-3`} value={editForm.contact_tracing.schedule} onChange={e => setEditForm(prev => ({ ...prev, contact_tracing: { ...prev.contact_tracing, schedule: e.target.value } }))} />
                </div>
                {editForm.contact_tracing.contacts.map((contact, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-blue-600">Contact {index + 1}</span>
                      {editForm.contact_tracing.contacts.length > 1 && (
                        <button type="button" onClick={() => removeEditContact(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    <label className={labelClass}>Name *</label>
                    <input className={inputClass} value={contact.name} onChange={e => handleEditContactChange(index, e.target.value)} required />
                  </div>
                ))}
                <button type="button" onClick={addEditContact} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
                  ⊕ Add Contact
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Notes</h3>
                <label className={labelClass}>Additional Notes (optional)</label>
                <textarea className={`${inputClass} border-blue-400`} rows={4} maxLength={500} value={editForm.additional_notes} onChange={e => handleEditFormChange('additional_notes', e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingPatientId(null)} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={editLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-green-400">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Patient Modal */}
      {transferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Transfer Patient</h2>
              <button onClick={() => setTransferTarget(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {transferTarget.first_name} {transferTarget.last_name} is currently at <span className="font-semibold text-gray-700">{transferTarget.health_center_name || transferTarget.barangay_name}</span>.
            </p>

            {transferError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{transferError}</div>}

            <div>
              <label className={labelClass}>Destination Barangay *</label>
              <select
                className={inputClass}
                value={transferBarangayId}
                onChange={e => {
                  const selected = barangays.find(b => b.barangay_id === e.target.value);
                  const centers = selected?.health_centers || [];
                  setTransferBarangayId(e.target.value);
                  setTransferHealthCenterId(centers.length === 1 ? centers[0].health_center_id : '');
                }}
              >
                <option value="">Select Barangay</option>
                {barangays.filter(b => b.barangay_id !== transferTarget.barangay_id).map(b => (
                  <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>
                ))}
              </select>
            </div>

            {transferBarangayId && (
              <div className="mt-4">
                <label className={labelClass}>Destination Health Center *</label>
                <select className={inputClass} value={transferHealthCenterId} onChange={e => setTransferHealthCenterId(e.target.value)}>
                  <option value="">Select Health Center</option>
                  {(barangays.find(b => b.barangay_id === transferBarangayId)?.health_centers || []).map(hc => (
                    <option key={hc.health_center_id} value={hc.health_center_id}>{hc.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setTransferTarget(null); setTransferBarangayId(''); setTransferHealthCenterId(''); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleTransferSubmit} disabled={transferLoading || !transferBarangayId || !transferHealthCenterId} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:bg-purple-300">
                {transferLoading ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Patient Confirmation */}
      {deletingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete patient record?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will archive {deletingPatient.first_name} {deletingPatient.last_name}'s record. It can be restored later from this list.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-left">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setDeletingPatient(null)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:bg-red-300">
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPanel;