import { useState, useEffect, useCallback } from "react";
import { fetchPatients } from "../../services/patient.service.js";
import { fetchMissedDoseAlerts, acknowledgeAlert, resolveAlert, sendFollowUpNotification } from "../../services/alert.service.js";

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

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [actioningAlertId, setActioningAlertId] = useState(null);
  const [followUpAlert, setFollowUpAlert] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  const admin       = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id = admin.barangay_id;

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchMissedDoseAlerts();
      if (data.success) {
        setAlerts((data.data?.alerts || []).filter(a => a.status !== 'Resolved'));
      }
    } catch (err) {
      console.error('Failed to load missed dose alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadAlerts();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadAlerts]);

  const handleAcknowledge = async (alertId) => {
    setActioningAlertId(alertId);
    try {
      const data = await acknowledgeAlert(alertId);
      if (data.success) loadAlerts();
      else alert(data.message || 'Failed to acknowledge alert.');
    } catch {
      alert('Connection error.');
    } finally {
      setActioningAlertId(null);
    }
  };

  const handleResolve = async (alertId) => {
    setActioningAlertId(alertId);
    try {
      const data = await resolveAlert(alertId);
      if (data.success) loadAlerts();
      else alert(data.message || 'Failed to resolve alert.');
    } catch {
      alert('Connection error.');
    } finally {
      setActioningAlertId(null);
    }
  };

  const submitFollowUp = async () => {
    setSendingFollowUp(true);
    try {
      const data = await sendFollowUpNotification(followUpAlert.alert_id, followUpMessage);
      if (data.success) {
        setFollowUpAlert(null);
        setFollowUpMessage('');
      } else {
        alert(data.message || 'Failed to send follow-up notification.');
      }
    } catch {
      alert('Connection error.');
    } finally {
      setSendingFollowUp(false);
    }
  };

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
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Compliance Monitoring</h1>
        <p className="text-gray-500">Track patient adherence</p>
      </div>

      {/* Missed Dose Alerts */}
      {!alertsLoading && alerts.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 mb-6 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-orange-200 flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Missed Dose Alerts</p>
            <span className="ml-auto text-xs text-orange-600">{alerts.length}</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-orange-100">
                {alerts.map((a) => (
                  <tr key={a.alert_id} className="hover:bg-orange-100/50 transition-colors">
                    <td className="p-3 pl-4 whitespace-nowrap">
                      <p className="font-semibold text-orange-900">{a.patient_name || a.tb_case_number}</p>
                    </td>
                    <td className="p-3 text-orange-700">{a.message}</td>
                    <td className="p-3 text-xs text-orange-600 whitespace-nowrap">
                      {a.status} · {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="p-3 pr-4 whitespace-nowrap">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setFollowUpAlert(a); setFollowUpMessage(''); }}
                          className="px-3 py-1 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition"
                        >
                          Send Follow-up
                        </button>
                        {a.status === "Active" && (
                          <button
                            onClick={() => handleAcknowledge(a.alert_id)}
                            disabled={actioningAlertId === a.alert_id}
                            className="px-3 py-1 text-xs font-semibold text-orange-700 bg-white border border-orange-200 rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(a.alert_id)}
                          disabled={actioningAlertId === a.alert_id}
                          className="px-3 py-1 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Send Follow-up Modal */}
      {followUpAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Send Follow-up</h2>
              <button onClick={() => setFollowUpAlert(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{followUpAlert.message}</p>
            <textarea
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              placeholder="Hi, we noticed you've missed some medication doses. Please reach out to your health center or take your next dose as soon as possible."
              rows={4}
              maxLength={500}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-orange-400/30 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setFollowUpAlert(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button
                onClick={submitFollowUp}
                disabled={sendingFollowUp}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition disabled:opacity-50"
              >
                {sendingFollowUp ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceMonitoringPanel;