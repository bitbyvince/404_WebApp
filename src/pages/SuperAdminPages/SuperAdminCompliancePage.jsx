import { useState, useEffect, useCallback } from "react";
import { fetchPatients } from "../../services/patient.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";
import { fetchMissedDoseAlerts, acknowledgeAlert, resolveAlert, sendFollowUpNotification } from "../../services/alert.service.js";

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

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [actioningAlertId, setActioningAlertId] = useState(null);
  const [followUpAlert, setFollowUpAlert] = useState(null);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

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

export default CompliancePanel;