import { useState, useEffect, useCallback } from "react";
import { fetchSymptomLogs, reviewSymptomLog, exportSymptomLogsPdf } from "../services/symptomLog.service.js";

const SEVERITY_LABEL = { 1: "Mild", 2: "Moderate", 3: "Severe" };
const SEVERITY_STYLE = {
  1: "bg-yellow-100 text-yellow-700",
  2: "bg-orange-100 text-orange-700",
  3: "bg-red-100 text-red-700",
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

// Shared by both the Super Admin and Barangay Admin/Nurse panels — the
// backend already scopes results to the requester's role (their own
// health center for nurse/barangay_admin, city-wide for super_admin/
// patc), so there's nothing role-specific left for the frontend to do.
const SymptomLogsPanel = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "", severity: "", reviewed: "" });
  const [reviewingId, setReviewingId] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSymptomLogs({
        from: filters.from || undefined,
        to: filters.to || undefined,
        severity: filters.severity || undefined,
        reviewed: filters.reviewed || undefined,
        limit: 200,
      });
      if (data.success) {
        setLogs(data.data?.data || []);
        setTotal(data.data?.total ?? 0);
      } else {
        setError(data.message || "Failed to load symptom logs.");
      }
    } catch (err) {
      setError("Connection error.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleReview = async (logId) => {
    setReviewingId(logId);
    try {
      const data = await reviewSymptomLog(logId);
      if (data.success) await loadLogs();
      else alert(data.message || "Failed to mark as reviewed.");
    } catch (err) {
      console.error(err);
      alert("Connection error.");
    } finally {
      setReviewingId(null);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportSymptomLogsPdf({
        from: filters.from || undefined,
        to: filters.to || undefined,
        severity: filters.severity || undefined,
        reviewed: filters.reviewed || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `symptom_logs_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export symptom logs:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => setFilters({ from: "", to: "", severity: "", reviewed: "" });
  const hasActiveFilters = filters.from || filters.to || filters.severity || filters.reviewed;

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return log.patient_name?.toLowerCase().includes(q) || log.tb_case_number?.toLowerCase().includes(q);
  });

  const unreviewedCount = logs.filter((l) => !l.reviewed_by).length;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Symptom Logs</h1>
          <p className="text-gray-500">Side effects and symptoms patients have reported</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting || filteredLogs.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:bg-blue-300"
        >
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-800">{total}</div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-1">Total Logs</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-red-600">{unreviewedCount}</div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-1">Needs Review</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-orange-500">{logs.filter((l) => l.symptoms?.some((s) => s.severity === 3)).length}</div>
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-1">Severe Reports</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or case number..."
            className="border rounded-lg px-3 py-2 text-sm outline-none w-64"
          />
          <label className="flex items-center gap-2 text-xs text-gray-500">
            From
            <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
            to
            <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
          </label>
          <select value={filters.severity} onChange={(e) => setFilters((p) => ({ ...p, severity: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none text-gray-600">
            <option value="">All Severities</option>
            <option value="1">Mild</option>
            <option value="2">Moderate</option>
            <option value="3">Severe</option>
          </select>
          <select value={filters.reviewed} onChange={(e) => setFilters((p) => ({ ...p, reviewed: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm outline-none text-gray-600">
            <option value="">All Statuses</option>
            <option value="false">Needs Review</option>
            <option value="true">Reviewed</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
              ✕ Clear Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Patient", "Health Center", "Symptoms", "Date Logged", "Status", ""].map((h) => (
                <th key={h} className="p-4 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : filteredLogs.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No symptom logs found.</td></tr>
            ) : filteredLogs.map((log) => (
              <tr key={log.log_id} className="hover:bg-gray-50 transition-colors align-top">
                <td className="p-4">
                  <p className="font-medium text-gray-800">{log.patient_name || "—"}</p>
                  <p className="text-xs text-gray-400">{log.tb_case_number}</p>
                </td>
                <td className="p-4 text-gray-500 text-xs">
                  {log.health_center_name || "—"}
                  <p className="text-gray-400">{log.barangay_name}</p>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {(log.symptoms || []).map((s, i) => (
                      <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEVERITY_STYLE[s.severity]}`}>
                        {s.symptom} · {SEVERITY_LABEL[s.severity]}
                      </span>
                    ))}
                  </div>
                  {log.free_text_notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{log.free_text_notes}"</p>
                  )}
                </td>
                <td className="p-4 text-gray-600">{formatDate(log.logged_at)}</td>
                <td className="p-4">
                  {log.reviewed_by ? (
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-green-100 text-green-700">
                      Reviewed
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-yellow-100 text-yellow-700">
                      Needs Review
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {!log.reviewed_by && (
                    <button
                      onClick={() => handleReview(log.log_id)}
                      disabled={reviewingId === log.log_id}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {reviewingId === log.log_id ? "Saving..." : "Mark Reviewed"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SymptomLogsPanel;
