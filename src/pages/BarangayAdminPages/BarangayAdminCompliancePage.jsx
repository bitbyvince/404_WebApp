import { useState, useEffect, useCallback } from "react";
import { fetchPatients } from "../../services/patient.service.js";

const riskBadge = (risk) => {
  if (risk === "Compliant") return "bg-green-100 text-green-700";
  if (risk === "At Risk")   return "bg-yellow-100 text-yellow-700";
  if (risk === "Defaulter") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-700";
};

const ComplianceMonitoringPanel = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [riskFilter, setRiskFilter]   = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const admin       = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id = admin.barangay_id;

  const load = useCallback(async (risk = '', phase = '', currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPatients({
        barangay_id,
        risk_level: risk,
        treatment_phase: phase,
        page: currentPage,
        limit,
      });
      if (data.success) {
        setPatients(data.data?.patients || []);
        setTotal(data.data?.total || 0);
      } else {
        setError(data.message || 'Failed to load compliance data.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }, [barangay_id]);

  useEffect(() => {
    load(riskFilter, phaseFilter, page);
  }, [riskFilter, phaseFilter, page, load]);

  const totalPages = Math.ceil(total / limit);

  const compliantCount = patients.filter(p => p.compliance?.risk_level === "Compliant").length;
  const atRiskCount    = patients.filter(p => p.compliance?.risk_level === "At Risk").length;
  const defaulterCount = patients.filter(p => p.compliance?.risk_level === "Defaulter").length;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Compliance Monitoring</h1>
        <p className="text-gray-500">Track patient adherence</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Compliant",  val: compliantCount, color: "text-green-600",  bg: "bg-green-50"  },
          { label: "At Risk",    val: atRiskCount,    color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "Defaulters", val: defaulterCount, color: "text-red-600",    bg: "bg-red-50"    },
        ].map((c, i) => (
          <div key={i} className={`${c.bg} rounded-xl border border-gray-100 p-4`}>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-center">
        <select
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900"
        >
          <option value="">All Risk Levels</option>
          <option value="Compliant">Compliant</option>
          <option value="At Risk">At Risk</option>
          <option value="Defaulter">Defaulter</option>
        </select>
        <select
          value={phaseFilter}
          onChange={(e) => { setPhaseFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900"
        >
          <option value="">All Phases</option>
          <option value="Intensive">Intensive</option>
          <option value="Continuation">Continuation</option>
        </select>
        {(riskFilter || phaseFilter) && (
          <button
            onClick={() => { setRiskFilter(''); setPhaseFilter(''); setPage(1); }}
            className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            ✕ Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{total} patient{total !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Patient", "Phase", "Doses Taken", "Missed Doses", "Compliance %", "Consecutive Missed", "Remaining Doses", "Risk Level"].map((h, i) => (
                <th key={h} className={`p-4 whitespace-nowrap ${i >= 2 ? 'text-center' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">No patients found.</td></tr>
            ) : patients.map((p, i) => {
              const c             = p.compliance || {};
              const dosesTaken    = c.doses_taken ?? 0;
              const totalExpected = c.total_expected_doses ?? 0;
              const missed        = c.doses_missed ?? 0;
              const consecutive   = c.consecutive_missed_doses ?? 0;
              const compliancePct = c.compliance_percentage ?? 0;
              const remaining     = c.doses_remaining ?? 0;

              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-gray-800">{p.first_name} {p.last_name}</p>
                  </td>
                  <td className="p-4 text-gray-600">{p.treatment_phase ?? '—'}</td>
                  <td className="p-4 text-center text-gray-800 font-medium">{dosesTaken}</td>
                  <td className="p-4 text-center text-red-500 font-medium">{missed}</td>
                  <td className="p-4">
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
    <div style={{ width: '60px', backgroundColor: '#f3f4f6', borderRadius: '9999px', height: '6px', overflow: 'hidden', flexShrink: 0 }}>
      <div
        style={{
          height: '6px',
          borderRadius: '9999px',
          width: `${compliancePct}%`,
          backgroundColor: compliancePct >= 80 ? '#22c55e' : compliancePct >= 65 ? '#facc15' : '#f87171',
        }}
      />
    </div>
    <span style={{ fontWeight: 500, color: '#1f2937' }}>{compliancePct}%</span>
  </div>
</td>
                  <td className="p-4 text-center text-orange-500 font-medium">{consecutive}</td>
                  <td className="p-4 text-center text-gray-600">{remaining}</td>
                  <td className="p-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${riskBadge(c.risk_level)}`}>
                      {c.risk_level ?? '—'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} patients</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplianceMonitoringPanel;