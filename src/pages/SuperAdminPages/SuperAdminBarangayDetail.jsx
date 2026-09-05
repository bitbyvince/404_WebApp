import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Layout from "../../components/Layout";
import { authFetch } from "../../services/auth.service.js";
import { fetchInventoryByBarangay, createNurse, fetchNurses } from "../../services/barangay.service.js";
import { fetchPatients, fetchEscalatedPatients, exportPatientsPdf } from "../../services/patient.service.js";
import { fetchStockRequestAlerts, acknowledgeAlert, resolveAlert } from "../../services/alert.service.js";

const menuItems = ["Dashboard", "Barangays", "Patients", "Compliance Monitoring", "Medicine Inventory", "Medicine Dispensing", "Reports", "Heat Map"];

const BarangayDetailPage = () => {
  const [barangayData, setBarangayData] = useState(null);
  const { barangay_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [barangayName, setBarangayName] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [loadingNurses, setLoadingNurses] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState("Barangays");

  const [showNurseModal, setShowNurseModal] = useState(false);
  const [nurseForm, setNurseForm] = useState({ first_name: '', last_name: '', email: '', password: '', phone_number: '' });
  const [nurseLoading, setNurseLoading] = useState(false);
  const [nurseErrors, setNurseErrors] = useState([]);
  const [nurseSuccess, setNurseSuccess] = useState('');
  const [showNursePassword, setShowNursePassword] = useState(false);

  const [escalatedPatients, setEscalated] = useState([]);
  const [loadingEscalation, setLoadingEscalation] = useState(true);

  // ── Export PDF ───────────────────────────────────────────────
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportPatientsPdf({ barangay_id });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${barangayName || barangay_id}_${Date.now()}.pdf`;
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

  // ── Stock Requests ──────────────────────────────────────────
  const [stockAlerts, setStockAlerts] = useState([]);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [showResolvedLog, setShowResolvedLog] = useState(false);

  const loadStockAlerts = useCallback(async () => {
    try {
      const data = await fetchStockRequestAlerts();
      if (data.success) {
        const all = data.data?.alerts || [];
        setStockAlerts(all.filter((a) => a.barangay_id === barangay_id));
      }
    } catch (err) {
      console.error('Failed to load stock alerts:', err);
    }
  }, [barangay_id]);

  const handleAcknowledgeAlert = async (alertId) => {
    setProcessingIds((prev) => new Set(prev).add(alertId));
    try {
      const data = await acknowledgeAlert(alertId);
      if (data.success) {
        await loadStockAlerts();
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const handleResolveAlert = async (alertId) => {
    setProcessingIds((prev) => new Set(prev).add(alertId));
    try {
      const data = await resolveAlert(alertId, 'Stock sent to barangay health center.');
      if (data.success) {
        await loadStockAlerts();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  };

  const ongoingStockAlerts = stockAlerts.filter((a) => a.status !== 'Resolved');
  const resolvedStockAlerts = stockAlerts.filter((a) => a.status === 'Resolved');

  const loadNurses = useCallback(async () => {
    setLoadingNurses(true);
    try {
      const data = await fetchNurses({ barangay_id, page: 1, limit: 100 });
      if (data.success) setNurses(data.data?.users || []);
    } catch (err) {
      console.error('Failed to load nurses:', err);
    } finally {
      setLoadingNurses(false);
    }
  }, [barangay_id]);

  const handleNurseSubmit = async () => {
    setNurseLoading(true);
    setNurseErrors([]);
    setNurseSuccess('');
    try {
      const payload = {
        first_name: nurseForm.first_name,
        last_name: nurseForm.last_name,
        email: nurseForm.email,
        password: nurseForm.password,
        role: 'nurse',
        barangay_id,
        barangay_name: barangayName,
        health_center_id: barangayData?.health_center?.health_center_id || '',
        ...(nurseForm.phone_number && {
          phone_number: nurseForm.phone_number.startsWith('09')
            ? '+63' + nurseForm.phone_number.slice(1)
            : nurseForm.phone_number,
        }),
      };
      const data = await createNurse(payload);
      if (data.success) {
        setNurseSuccess(`Nurse account created for ${data.data?.first_name} ${data.data?.last_name}.`);
        setNurseForm({ first_name: '', last_name: '', email: '', password: '', phone_number: '' });
        loadNurses();
      } else {
        setNurseErrors(data.errors?.map(e => e.message) || [data.message || 'Failed to create nurse account.']);
      }
    } catch (err) {
      setNurseErrors(['Connection error.']);
    } finally {
      setNurseLoading(false);
    }
  };

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const data = await fetchPatients({ barangay_id, page: 1, limit: 100 });
        if (data.success) {
          const list = data.data?.patients || [];
          setPatients(list);
          if (list.length > 0) setBarangayName(list[0].barangay_name);
        } else {
          setError(data.message || 'Failed to load patients.');
        }
      } catch (err) {
        setError('Connection error.');
      } finally {
        setLoadingPatients(false);
      }
    };

    const loadBarangayData = async () => {
      try {
        const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/barangays/${barangay_id}`);
        const data = await res.json();
        if (data.success) setBarangayData(data.data || data.barangay);
      } catch (err) {
        console.error('Failed to load barangay data:', err);
      }
    };

    const loadInventory = async () => {
      setLoadingInventory(true);
      try {
        const data = await fetchInventoryByBarangay(barangay_id);
        if (data.success) {
          const raw = data.data?.inventory ?? data.data ?? [];
          setInventory(Array.isArray(raw) ? raw : []);
        }
      } catch (err) {
        console.error('Failed to load inventory:', err);
      } finally {
        setLoadingInventory(false);
      }
    };

    const loadEscalated = async () => {
      setLoadingEscalation(true);
      try {
        const data = await fetchEscalatedPatients(3, barangay_id);
        if (data.success) setEscalated(data.data?.patients || []);
      } catch (err) {
        console.error('Failed to load escalations:', err);
      } finally {
        setLoadingEscalation(false);
      }
    };

    loadEscalated();
    loadPatients();
    loadInventory();
    loadBarangayData();
    loadNurses();
    loadStockAlerts();
  }, [barangay_id, loadNurses, loadStockAlerts]);

  const totalAllocated = inventory.reduce((sum, i) => sum + (i.total_allocated || 0), 0);
  const totalDispensed = inventory.reduce((sum, i) => sum + (i.total_dispensed || 0), 0);
  const remainingStock = inventory.reduce((sum, i) => sum + (i.remaining_stock || 0), 0);

  const badge = (type) => {
    if (type === "Compliant") return "bg-green-100 text-green-700";
    if (type === "At Risk") return "bg-yellow-100 text-yellow-700";
    if (type === "Defaulter") return "bg-red-100 text-red-600";
    return "bg-gray-100 text-gray-700";
  };

  const stockBadge = (status) => {
    if (status === "OK") return "bg-green-100 text-green-700";
    if (status === "Low") return "bg-yellow-100 text-yellow-700";
    if (status === "Critical") return "bg-orange-100 text-orange-700";
    if (status === "Stockout") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <Layout
      menuItems={menuItems}
      activeMenu={active}
      setActiveMenu={(menu) => {
        setActive(menu);
        navigate('/dashboard', { state: { activePanel: menu } });
      }}
      title={barangayName || barangay_id}
      subtitle="Municipal Admin"
    >
      <div className="space-y-6">

        {/* Back button */}
        <button
          onClick={() => {
            const returnPanel = location.state?.returnPanel || 'Barangays';
            navigate('/dashboard', { state: { activePanel: returnPanel } });
          }}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
        >
          ← Back
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}

        {/* Stock Requests */}
        {ongoingStockAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Stock Requests</h2>
                <p className="text-xs text-gray-500 mt-0.5">Triggered when a new patient is registered at this barangay</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-bold bg-red-600 text-white">
                {ongoingStockAlerts.length} Ongoing
              </span>
            </div>
            <div className="divide-y">
              {ongoingStockAlerts.map((a) => {
                const isProcessing = processingIds.has(a.alert_id);
                return (
                  <div key={a.alert_id} className="p-4 flex justify-between items-start gap-4">
                    <div>
                      <p className="text-sm text-gray-800">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {a.created_at ? new Date(a.created_at).toLocaleString('en-PH') : ''}
                        {' · '}
                        <span className={`font-semibold ${a.status === 'Acknowledged' ? 'text-blue-600' : 'text-red-600'}`}>
                          {a.status}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {a.status === 'Active' && (
                        <button
                          onClick={() => handleAcknowledgeAlert(a.alert_id)}
                          disabled={isProcessing}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:bg-blue-300"
                        >
                          {isProcessing ? 'Sending...' : 'Acknowledge'}
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveAlert(a.alert_id)}
                        disabled={isProcessing}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:bg-green-300"
                      >
                        {isProcessing ? 'Sending...' : 'Mark Stock Sent'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {resolvedStockAlerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowResolvedLog((p) => !p)}
              className="w-full px-6 py-4 flex justify-between items-center text-left"
            >
              <h2 className="text-sm font-bold text-gray-600">Resolved Stock Requests ({resolvedStockAlerts.length})</h2>
              <span className="text-xs text-gray-400">{showResolvedLog ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            {showResolvedLog && (
              <div className="divide-y border-t">
                {resolvedStockAlerts.map((a) => (
                  <div key={a.alert_id} className="p-4">
                    <p className="text-sm text-gray-600">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Resolved {a.resolved_at ? new Date(a.resolved_at).toLocaleString('en-PH') : ''}
                      {a.resolution_notes ? ` — ${a.resolution_notes}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Patients</h2>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {exportingPdf ? 'Exporting...' : '⬇ Export PDF'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {["TB Case No.", "Last Name", "First Name", "Middle Name", "Birthdate", "Age", "Sex", "Health Facility", "Anatomical Site", "Bacteriologic Status", "Date of Screening", "Date Started Tx.", "Risk"].map(h => (
                    <th key={h} className="p-4 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingPatients ? (
                  <tr><td colSpan={13} className="p-6 text-center text-gray-400">Loading patients...</td></tr>
                ) : patients.length === 0 ? (
                  <tr><td colSpan={13} className="p-6 text-center text-gray-400">No patients in this barangay.</td></tr>
                ) : (
                  patients.map((p, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-700 whitespace-nowrap">{p.tb_case_number ?? '—'}</td>
                      <td className="p-4 font-semibold text-gray-700">{p.last_name ?? '—'}</td>
                      <td className="p-4 text-gray-700">{p.first_name ?? '—'}</td>
                      <td className="p-4 text-gray-600">{p.middle_name || '—'}</td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">{p.birth_date ? new Date(p.birth_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                      <td className="p-4 text-gray-600">{p.age ?? '—'}</td>
                      <td className="p-4 text-gray-600">{p.sex ?? '—'}</td>
                      <td className="p-4 text-gray-600">{p.health_center_name ?? '—'}</td>
                      <td className="p-4 text-gray-600">{p.classification ?? '—'}</td>
                      <td className="p-4 text-gray-600">{p.bacteriological_status ?? '—'}</td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">{p.date_of_diagnosis ? new Date(p.date_of_diagnosis).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">{p.date_started ? new Date(p.date_started).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${badge(p.compliance?.risk_level)}`}>
                          {p.compliance?.risk_level ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Barangay Inventory</h2>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Allocated", val: totalAllocated.toLocaleString(), color: "text-blue-600" },
              { label: "Total Dispensed", val: totalDispensed.toLocaleString(), color: "text-purple-600" },
              { label: "Remaining Stock", val: remainingStock.toLocaleString(), color: "text-green-600" },
              { label: "Active Patients", val: patients.length, color: "text-gray-800" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.val}</p>
              </div>
            ))}
          </div>
          {!loadingInventory && inventory.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {["Drug", "Strength", "Unit", "Allocated", "Dispensed", "Remaining", "Status"].map(h => (
                    <th key={h} className="p-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-medium text-gray-700">{item.drug_name}</td>
                    <td className="p-3 text-gray-600">{item.strength}</td>
                    <td className="p-3 text-gray-600">{item.unit}</td>
                    <td className="p-3 text-gray-600">{item.total_allocated?.toLocaleString()}</td>
                    <td className="p-3 text-gray-600">{item.total_dispensed?.toLocaleString()}</td>
                    <td className="p-3 text-gray-600">{item.remaining_stock?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${stockBadge(item.stock_status)}`}>
                        {item.stock_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Nurses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Nurses</h2>
            <button
              onClick={() => { setShowNurseModal(true); setNurseErrors([]); setNurseSuccess(''); }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
            >
              + Add Nurse
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {["Name", "Email", "Phone", "Status", "Created"].map(h => (
                  <th key={h} className="p-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingNurses ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading nurses...</td></tr>
              ) : nurses.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No nurses assigned to this barangay.</td></tr>
              ) : (
                nurses.map((n, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold text-gray-800">{n.first_name} {n.last_name}</td>
                    <td className="p-4 text-gray-600">{n.email}</td>
                    <td className="p-4 text-gray-600">{n.phone_number || '—'}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {n.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                      {n.created_at ? new Date(n.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Escalation Inbox */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Escalation Inbox</h2>
            <p className="text-xs text-gray-400 mt-0.5">Level 3 — Lost to Follow-Up (30+ consecutive missed doses)</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${escalatedPatients.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {escalatedPatients.length > 0 ? `${escalatedPatients.length} Active` : 'All Clear'}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Patient", "TB Case No.", "Consecutive Missed", "Escalated At", "Notes"].map(h => (
                <th key={h} className="p-4 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingEscalation ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading escalations...</td></tr>
            ) : escalatedPatients.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400">✅ No Level 3 escalations for this barangay.</td></tr>
            ) : (
              escalatedPatients.map((p, i) => (
                <tr key={i} className="border-t hover:bg-red-50 transition-colors">
                  <td className="p-4 font-semibold text-gray-800">{p.full_name}</td>
                  <td className="p-4 font-mono text-xs text-gray-600">{p.tb_case_number}</td>
                  <td className="p-4 text-red-600 font-bold">{p.compliance?.consecutive_missed_doses ?? 0} days</td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {p.escalation?.escalated_at
                      ? new Date(p.escalation.escalated_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{p.escalation?.notes || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Nurse Modal */}
      {showNurseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Add Nurse</h2>
                <p className="text-sm text-gray-500">For {barangayName || barangay_id}</p>
              </div>
              <button onClick={() => { setShowNurseModal(false); setNurseErrors([]); setNurseSuccess(''); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {nurseErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm space-y-1">
                {nurseErrors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
            {nurseSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{nurseSuccess}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-600 font-medium">First Name *</label>
                  <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={nurseForm.first_name} onChange={e => setNurseForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-zinc-600 font-medium">Last Name *</label>
                  <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={nurseForm.last_name} onChange={e => setNurseForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium">Email *</label>
                <input type="email" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" value={nurseForm.email} onChange={e => setNurseForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium">Phone Number</label>
                <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="09XXXXXXXXX" value={nurseForm.phone_number} onChange={e => setNurseForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium">Password *</label>
                <div className="relative">
                  <input
                    type={showNursePassword ? 'text' : 'password'}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Min. 8 chars, 1 uppercase, 1 lowercase, 1 number"
                    value={nurseForm.password}
                    onChange={e => setNurseForm(p => ({ ...p, password: e.target.value }))}
                  />
                  <button type="button" onClick={() => setShowNursePassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs mt-0.5">
                    {showNursePassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-600 font-medium">Barangay</label>
                <input className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" value={barangayName || barangay_id} disabled readOnly />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowNurseModal(false); setNurseForm({ first_name: '', last_name: '', email: '', password: '', phone_number: '' }); setNurseErrors([]); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleNurseSubmit} disabled={nurseLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-green-400">
                {nurseLoading ? 'Creating...' : 'Create Nurse Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BarangayDetailPage;