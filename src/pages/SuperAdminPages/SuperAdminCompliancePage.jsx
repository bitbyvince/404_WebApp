import { useState, useEffect, useCallback } from "react";
import { fetchPatients } from "../../services/patient.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const badge = (type) => {
  if (type === "Compliant") return "bg-green-100 text-green-700";
  if (type === "At Risk") return "bg-yellow-100 text-yellow-700";
  if (type === "Defaulter") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-700";
};

const CompliancePanel = () => {
  const [patients, setPatients] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    barangay_id: '',
    risk_level: '',
    treatment_phase: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const loadPatients = useCallback(async (activeFilters = {}, currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPatients({
        ...activeFilters,
        page: currentPage,
        limit,
      });
      if (data.success) {
        setPatients(data.data?.patients || []);
        setTotal(data.data?.total || 0);
        
      } else {
        setError(data.message || 'Failed to load compliance data.');
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
    loadPatients(filters, page);
  }, [filters, page, loadPatients]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ barangay_id: '', risk_level: '', treatment_phase: '' });
    setPage(1);
  };

  const hasActiveFilters = filters.barangay_id || filters.risk_level || filters.treatment_phase;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-semibold mb-2 text-gray-800">Compliance Monitoring</h2>
      <p className="text-sm text-zinc-500 mb-4">Track patient adherence across all barangays</p>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mt-6 mb-4 flex gap-3 flex-wrap">
        <select
          value={filters.barangay_id}
          onChange={(e) => handleFilterChange('barangay_id', e.target.value)}
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Barangays</option>
          {barangays.map(b => (
            <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filters.risk_level}
          onChange={(e) => handleFilterChange('risk_level', e.target.value)}
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Risk Levels</option>
          <option value="Compliant">Compliant</option>
          <option value="At Risk">At Risk</option>
          <option value="Defaulter">Defaulter</option>
        </select>

        <select
          value={filters.treatment_phase}
          onChange={(e) => handleFilterChange('treatment_phase', e.target.value)}
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Phases</option>
          <option value="Intensive">Intensive</option>
          <option value="Continuation">Continuation</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              {["Name", "Barangay", "Phase", "Doses Taken", "Missed Doses", "Compliance %", "Remaining", "Risk Level"].map(h => (
                <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">No patients found.</td></tr>
            ) : (
              patients.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors align-middle">
                  <td className="p-3 text-gray-700 font-medium whitespace-nowrap">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="p-3 text-gray-600">{p.barangay_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{p.treatment_phase ?? '—'}</td>
                  <td className="p-3">{p.compliance?.doses_taken ?? 0}</td>
                  <td className="p-3 text-red-500 font-bold">{p.compliance?.doses_missed ?? 0}</td>
                  <td className="p-3 font-semibold">{p.compliance?.compliance_percentage ?? 0}%</td>
                  <td className="p-3 text-gray-600">{p.compliance?.doses_remaining ?? 0}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${badge(p.compliance?.risk_level)}`}>
                      {p.compliance?.risk_level ?? '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
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
    </div>
  );
};

export default CompliancePanel;