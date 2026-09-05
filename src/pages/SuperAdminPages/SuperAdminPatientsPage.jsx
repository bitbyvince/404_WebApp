import { useState, useEffect, useCallback } from "react";
import { fetchPatients, registerPatient, fetchPatientById, resetPatientPin, exportPatientsPdf } from "../../services/patient.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const badge = (type) => {
  if (type === "Compliant") return "bg-green-100 text-green-700";
  if (type === "At Risk") return "bg-yellow-100 text-yellow-700";
  if (type === "Defaulter") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-700";
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
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

const EMPTY_FORM = {
  last_name: '', first_name: '', middle_name: '',
  birth_date: '', age: '', sex: '',
  philhealth_number: '', phone_number: '', email: '',
  barangay_id: '',
  barangay_name: '', health_center_name: '',
  assigned_nurse_id: '',
  diagnosis: '', date_of_diagnosis: '',
  classification: '', bacteriological_status: '',
  patient_type: { is_new: true, is_retreatment: false, is_drug_susceptible: true, is_drug_resistant: false },
  treatment_phase: '', location_of_treatment: '',
  date_started: '', dat_support: '', regimen_type: '',
  drug_regimen: [{ drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }],
  treatment_supporter: { name: '', contact: '' },
  contact_tracing: { number_of_contacts: 0, schedule: '' },
  additional_notes: '',
};

const PatientsPanel = () => {
  const [patients, setPatients] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ barangay_id: '', risk_level: '', treatment_phase: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [pinModal, setPinModal] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [resetPinResult, setResetPinResult] = useState(null);
  const [resetPinLoading, setResetPinLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

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

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportPatientsPdf({
        barangay_id: filters.barangay_id || undefined,
        risk_level: filters.risk_level || undefined,
        treatment_phase: filters.treatment_phase || undefined,
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

  const handleResetPin = async (patientId) => {
    setResetPinLoading(true);
    try {
      const data = await resetPatientPin(patientId);
      if (data.success) setResetPinResult(data.data?.newPin);
    } catch (err) {
      console.error(err);
    } finally {
      setResetPinLoading(false);
    }
  };

  const loadPatients = useCallback(async (searchValue = '', activeFilters = {}, currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPatients({
        search: searchValue,
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
  }, []);

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPatients(search, filters, page);
    }, search ? 500 : 0);
    return () => clearTimeout(timeout);
  }, [search, filters, page, loadPatients]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ barangay_id: '', risk_level: '', treatment_phase: '' });
    setPage(1);
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientTypeChange = (field, value) => {
    setForm(prev => ({ ...prev, patient_type: { ...prev.patient_type, [field]: value } }));
  };

  const handleDrugChange = (index, field, value) => {
    const updated = [...form.drug_regimen];
    updated[index] = { ...updated[index], [field]: value };
    setForm(prev => ({ ...prev, drug_regimen: updated }));
  };

  const addDrug = () => {
    setForm(prev => ({
      ...prev,
      drug_regimen: [...prev.drug_regimen, { drug_name: '', strength: '', unit: 'tablet', number_to_be_taken: 1 }],
    }));
  };

  const removeDrug = (index) => {
    setForm(prev => ({
      ...prev,
      drug_regimen: prev.drug_regimen.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const matchedBarangay = barangays.find(b => b.barangay_id === form.barangay_id);

      const payload = {
        ...form,
        barangay_id: form.barangay_id || '',
        barangay_name: matchedBarangay?.name || form.barangay_name || '',
        health_center_id: matchedBarangay?.health_center?.health_center_id || matchedBarangay?.health_center_id || '',
        health_center_name: matchedBarangay?.health_center?.name || form.health_center_name || '',
        age: parseInt(form.age),
        contact_tracing: {
          ...form.contact_tracing,
          number_of_contacts: parseInt(form.contact_tracing.number_of_contacts),
          schedule: form.contact_tracing.schedule || null,
        },
        drug_regimen: form.drug_regimen.map(d => ({
          ...d,
          number_to_be_taken: parseInt(d.number_to_be_taken),
        })),
        treatment_supporter: {
          name: form.treatment_supporter.name || null,
          contact: form.treatment_supporter.contact || null,
        },
        philhealth_number: form.philhealth_number || null,
        email: form.email || null,
        assigned_nurse_id: form.assigned_nurse_id || null,
        additional_notes: form.additional_notes || '',
      };

      // ✅ FIX: actually call registerPatient and capture the response
      const data = await registerPatient(payload);

      if (data.success) {
        setForm(EMPTY_FORM);
        loadPatients(search, filters, 1);
        setShowModal(false);
        setPinModal({
          patient_id: data.data?.patient?.patient_id,
          defaultPin: data.data?.defaultPin,
        });
      } else {
        setFormError(data.message || 'Failed to register patient.');
      }
    } catch (err) {
      setFormError('Connection error.');
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = search || filters.barangay_id || filters.risk_level || filters.treatment_phase;
  const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-xs text-zinc-600 font-medium";

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">All Patients</h2>
          <p className="text-sm text-gray-500">Municipal-wide patient registry</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowModal(true); setFormError(''); setFormSuccess(''); }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
          >
            + Add Patient
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:bg-blue-300"
          >
            {exportingPdf ? 'Exporting...' : '⬇ Export PDF'}
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 space-y-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, TB case number, or patient ID..."
          className="w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="flex gap-3 flex-wrap">
          <select value={filters.barangay_id} onChange={(e) => handleFilterChange('barangay_id', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">All Barangays</option>
            {barangays.map((b) => <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>)}
          </select>
          <select value={filters.risk_level} onChange={(e) => handleFilterChange('risk_level', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">All Risk Levels</option>
            <option value="Compliant">Compliant</option>
            <option value="At Risk">At Risk</option>
            <option value="Defaulter">Defaulter</option>
          </select>
          <select value={filters.treatment_phase} onChange={(e) => handleFilterChange('treatment_phase', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">All Phases</option>
            <option value="Intensive">Intensive</option>
            <option value="Continuation">Continuation</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              {["TB Case No.", "Last Name", "First Name", "Middle Name", "Birthdate", "Age", "Sex", "Barangay", "Treatment Health Facility", "Anatomical Site", "Bacteriologic Status", "Date of Screening", "RDT Result", "Date Started Tx.", "Actions"].map(h => (
                <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="p-6 text-center text-gray-400">Loading patients...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={15} className="p-6 text-center text-gray-400">No patients found.</td></tr>
            ) : (
              patients.map((p, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 text-gray-700 whitespace-nowrap font-mono text-xs">{p.tb_case_number ?? '—'}</td>
                  <td className="p-3 font-semibold text-gray-700">{p.last_name ?? '—'}</td>
                  <td className="p-3 text-gray-700">{p.first_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.middle_name || '—'}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.birth_date)}</td>
                  <td className="p-3 text-gray-600">{p.age ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.sex ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.barangay_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.health_center_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.classification ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.bacteriological_status ?? '—'}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.date_of_diagnosis)}</td>
                  <td className="p-3 text-gray-600">{p.rdt_result ?? '—'}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">{formatDate(p.date_started)}</td>
                  <td
                    className="p-3 text-blue-600 cursor-pointer font-medium hover:underline whitespace-nowrap"
                    onClick={() => handleView(p.patient_id)}
                  >
                    {viewLoading ? '...' : '👁 View'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} patients</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border text-sm ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Register New Patient</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); setFormSuccess(''); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{formError}</div>}
            {formSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{formSuccess}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Patient Information */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Patient Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>First Name *</label><input className={inputClass} value={form.first_name} onChange={e => handleFormChange('first_name', e.target.value)} required /></div>
                  <div><label className={labelClass}>Last Name *</label><input className={inputClass} value={form.last_name} onChange={e => handleFormChange('last_name', e.target.value)} required /></div>
                  <div className="col-span-2"><label className={labelClass}>Middle Name</label><input className={inputClass} value={form.middle_name} onChange={e => handleFormChange('middle_name', e.target.value)} /></div>
                  <div><label className={labelClass}>Age *</label><input type="number" className={inputClass} value={form.age} onChange={e => handleFormChange('age', e.target.value)} required /></div>
                  <div>
                    <label className={labelClass}>Sex *</label>
                    <select className={inputClass} value={form.sex} onChange={e => handleFormChange('sex', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Birthday *</label><input type="date" className={inputClass} value={form.birth_date} onChange={e => handleFormChange('birth_date', e.target.value)} required /></div>
                  <div>
                    <label className={labelClass}>Phone Number * (e.g. 09171234567)</label>
                    <input
                      className={inputClass}
                      placeholder="09171234567 or +639XXXXXXXXX"
                      value={form.phone_number}
                      onChange={e => handleFormChange('phone_number', formatPhone(e.target.value))}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>PhilHealth No. (format: 12-123456789-0)</label>
                    <input
                      className={inputClass}
                      placeholder="12-123456789-0"
                      value={form.philhealth_number}
                      onChange={e => handleFormChange('philhealth_number', formatPhilHealth(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Barangay *</label>
                    <select
                      className={inputClass}
                      value={form.barangay_id}
                      onChange={e => handleFormChange('barangay_id', e.target.value)}
                      required
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map(b => (
                        <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Diagnosis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Diagnosis *</label>
                    <select className={inputClass} value={form.diagnosis} onChange={e => handleFormChange('diagnosis', e.target.value)} required>
                      <option value="">Select diagnosis</option>
                      <option value="Pulmonary TB">Pulmonary TB</option>
                      <option value="Extra-pulmonary TB">Extra-pulmonary TB</option>
                      <option value="Drug-resistant TB">Drug-resistant TB</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Diagnosis & Start *</label>
                    <input type="date" className={inputClass} value={form.date_of_diagnosis} onChange={e => { handleFormChange('date_of_diagnosis', e.target.value); handleFormChange('date_started', e.target.value); }} required />
                  </div>
                </div>
              </div>

              {/* TB Classification */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">TB Classification</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelClass}>Classification *</label>
                    <select className={inputClass} value={form.classification} onChange={e => handleFormChange('classification', e.target.value)} required>
                      <option value="">Pulmonary or Extra-pulmonary</option>
                      <option value="Pulmonary">Pulmonary</option>
                      <option value="Extra-pulmonary">Extra-pulmonary</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Bacteriological Status *</label>
                    <select className={inputClass} value={form.bacteriological_status} onChange={e => handleFormChange('bacteriological_status', e.target.value)} required>
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
                      <input type="checkbox" checked={form.patient_type[field]} onChange={e => handlePatientTypeChange(field, e.target.checked)} className="w-4 h-4 rounded" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Treatment Details */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Treatment Phase *</label>
                    <select className={inputClass} value={form.treatment_phase} onChange={e => handleFormChange('treatment_phase', e.target.value)} required>
                      <option value="">Select</option>
                      <option value="Intensive">Intensive</option>
                      <option value="Continuation">Continuation</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location of Treatment *</label>
                    <select className={inputClass} value={form.location_of_treatment} onChange={e => handleFormChange('location_of_treatment', e.target.value)} required>
                      <option value="">Select location</option>
                      <option value="Health Facility">Health Facility</option>
                      <option value="Community">Community</option>
                      <option value="Home">Home</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>DAT Support *</label>
                    <select className={inputClass} value={form.dat_support} onChange={e => handleFormChange('dat_support', e.target.value)} required>
                      <option value="">Select DAT support</option>
                      <option value="Direct Observed Treatment">Direct Observed Treatment</option>
                      <option value="Video-observed Treatment">Video-observed Treatment</option>
                      <option value="Self-administered">Self-administered</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Regimen Type *</label>
                    <input className={inputClass} placeholder="e.g. 2HRZE/4HR" value={form.regimen_type} onChange={e => handleFormChange('regimen_type', e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Drug Regimen */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Drug Regimen</h3>
                {form.drug_regimen.map((drug, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-semibold text-blue-600">Drug {index + 1}</span>
                      {form.drug_regimen.length > 1 && (
                        <button type="button" onClick={() => removeDrug(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Drug Name</label>
                        <select className={inputClass} value={drug.drug_name} onChange={e => handleDrugChange(index, 'drug_name', e.target.value)} required>
                          <option value="">Drug Name</option>
                          <option value="Isoniazid">Isoniazid</option>
                          <option value="Rifampicin">Rifampicin</option>
                          <option value="Pyrazinamide">Pyrazinamide</option>
                          <option value="Ethambutol">Ethambutol</option>
                        </select>
                      </div>
                      <div><label className={labelClass}>Strength</label><input className={inputClass} placeholder="Strength" value={drug.strength} onChange={e => handleDrugChange(index, 'strength', e.target.value)} required /></div>
                      <div>
                        <label className={labelClass}>Unit</label>
                        <select className={inputClass} value={drug.unit} onChange={e => handleDrugChange(index, 'unit', e.target.value)}>
                          <option value="tablet">Tablet</option>
                          <option value="capsule">Capsule</option>
                          <option value="vial">Vial</option>
                          <option value="sachet">Sachet</option>
                        </select>
                      </div>
                      <div><label className={labelClass}>Qty</label><input type="number" className={inputClass} placeholder="Qty" min={1} value={drug.number_to_be_taken} onChange={e => handleDrugChange(index, 'number_to_be_taken', e.target.value)} required /></div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addDrug} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
                  ⊕ Add Drug
                </button>
              </div>

              {/* Treatment Supporter */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Treatment Supporter</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Supporter Name</label>
                    <input className={inputClass} value={form.treatment_supporter.name} onChange={e => setForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, name: e.target.value } }))} />
                  </div>
                  <div>
                    <label className={labelClass}>Supporter Contact (e.g. 09171234567)</label>
                    <input
                      className={inputClass}
                      placeholder="09171234567 or +639XXXXXXXXX"
                      value={form.treatment_supporter.contact}
                      onChange={e => {
                        const val = formatPhone(e.target.value);
                        setForm(prev => ({ ...prev, treatment_supporter: { ...prev.treatment_supporter, contact: val } }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Tracing */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Contact Tracing (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Number of Contacts</label><input type="number" min={0} className={inputClass} value={form.contact_tracing.number_of_contacts} onChange={e => setForm(prev => ({ ...prev, contact_tracing: { ...prev.contact_tracing, number_of_contacts: e.target.value } }))} /></div>
                  <div><label className={labelClass}>Contact Tracing Schedule</label><input type="date" className={inputClass} value={form.contact_tracing.schedule} onChange={e => setForm(prev => ({ ...prev, contact_tracing: { ...prev.contact_tracing, schedule: e.target.value } }))} /></div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="text-base font-bold text-blue-700 mb-4">Notes</h3>
                <label className={labelClass}>Additional Notes (optional)</label>
                <textarea className={`${inputClass} border-blue-400`} rows={4} maxLength={500} value={form.additional_notes} onChange={e => handleFormChange('additional_notes', e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setForm(EMPTY_FORM); setFormError(''); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-green-400">
                  {formLoading ? 'Registering...' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Patient Registered</h2>
            <p className="text-sm text-gray-500 mb-6">Give these credentials to the patient for mobile app login.</p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Patient ID</span>
                <span className="text-sm font-bold text-gray-800 font-mono">{pinModal.patient_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Default PIN</span>
                <span className="text-2xl font-bold text-blue-600 tracking-widest">{pinModal.defaultPin}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-6">The patient can change their PIN after logging in.</p>
            <button
              onClick={() => setPinModal(null)}
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* View Patient Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}</h2>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedPatient.tb_case_number}</p>
              </div>
              <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
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
                {resetPinLoading ? 'Resetting...' : '🔁 Reset PIN'}
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
              <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsPanel;