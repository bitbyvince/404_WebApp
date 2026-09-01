import { useState, useEffect, useCallback } from "react";
// AFTER
import { fetchPatients, fetchPatientById, resetPatientPin } from "../../services/patient.service.js";


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



const PatientsPanel = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [resetPinResult, setResetPinResult] = useState(null);
  const [resetPinLoading, setResetPinLoading] = useState(false);

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

  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filters, setFilters]   = useState({ risk_level: '', treatment_phase: '' });
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
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

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ risk_level: '', treatment_phase: '' });
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = search || filters.risk_level || filters.treatment_phase;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Patients</h2>
          <p className="text-sm text-gray-500">Manage your barangay patients</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
          ⬇ Export PDF
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
              {["TB Case No.", "Last Name", "First Name", "Middle Name", "Birthdate", "Age", "Sex", "Health Facility", "Anatomical Site", "Bacteriologic Status", "Date of Screening", "Date Started Tx.", "Risk", "Actions"].map(h => (
                <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="p-6 text-center text-gray-400">Loading patients...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={14} className="p-6 text-center text-gray-400">No patients found.</td></tr>
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
                <td
                  className="p-3 text-blue-600 cursor-pointer font-medium hover:underline whitespace-nowrap"
                  onClick={() => handleView(p.patient_id)}
                >
                  {viewLoading ? '...' : '👁 View'}
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}</h2>
              <p className="text-xs text-gray-400 font-mono mt-1">{selectedPatient.tb_case_number}</p>
            </div>
            <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Close</button>
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
            <button onClick={() => { setSelectedPatient(null); setResetPinResult(null); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};

export default PatientsPanel;