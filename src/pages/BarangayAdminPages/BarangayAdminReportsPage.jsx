import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchBarangayReport, fetchComplianceTrend } from "../../services/report.service.js";
const badge = (risk) => {
  if (risk === "Compliant") return "bg-green-100 text-green-700";
  if (risk === "At Risk")   return "bg-yellow-100 text-yellow-700";
  if (risk === "Defaulter") return "bg-red-100 text-red-600";
  return "bg-gray-100 text-gray-700";
};

const ReportsPanel = () => {
  const [report, setReport]       = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [exportingReport, setExportingReport] = useState(null);

  const admin       = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id = admin.barangay_id;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [reportRes, trendRes] = await Promise.all([
          fetchBarangayReport({ barangay_id }),
          fetchComplianceTrend({ barangay_id, period: 'monthly', limit: 7 }),
        ]);

        if (reportRes.success) setReport(reportRes.data);
        else setError(reportRes.message || 'Failed to load report.');

        if (trendRes.success) setTrendData(trendRes.data || []);
      } catch (err) {
        setError('Connection error.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [barangay_id]);

  const summary  = report?.patient_summary || {};
  const patients = report?.patients || [];

  const downloadReportPdf = async (endpoint, filename, key) => {
    setExportingReport(key);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/reports/${endpoint}?barangay_id=${barangay_id}&format=pdf`,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!res.ok) throw new Error(`Export failed with status ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(`Failed to export ${key} report:`, err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportingReport(null);
    }
  };

  const lineData = trendData.map(t => ({
    month: t.period || t.snapshot_date?.slice(0, 7) || '—',
    value: t.compliance_percentage ?? t.average_compliance_percentage ?? 0,
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading reports...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Reports</h1>
        <p className="text-gray-500">Barangay analytics and insights</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Average Compliance", val: `${summary.average_compliance_percentage ?? 0}%`, color: "text-green-600" },
          { label: "Total At Risk",      val: summary.at_risk ?? 0,                              color: "text-orange-500" },
          { label: "Total Defaulters",   val: summary.defaulter ?? 0,                            color: "text-red-600" },
          { label: "Total Patients",     val: summary.total_active ?? 0,                         color: "text-blue-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-400 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      {lineData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Compliance Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Patient Details Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Patient Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {["Name", "Compliance %", "Doses Taken", "Remaining", "Risk"].map(h => (
                  <th key={h} className="p-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No patient data.</td></tr>
              ) : (
                patients.map((p, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-zinc-700">
                      {p.full_name || `${p.first_name} ${p.last_name}`}
                    </td>
                    <td className="p-3 text-zinc-600">{p.compliance?.compliance_percentage ?? 0}%</td>
                    <td className="p-3 text-zinc-600">
                      {p.compliance?.doses_taken ?? 0} / {p.compliance?.total_doses_required ?? 0}
                    </td>
                    <td className="p-3 text-red-500 font-semibold">{p.compliance?.doses_remaining ?? 0}</td>
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
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white p-6 rounded-xl shadow-sm mt-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Export Reports</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => downloadReportPdf('barangay', `compliance_report_${Date.now()}.pdf`, 'compliance')}
            disabled={exportingReport === 'compliance'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {exportingReport === 'compliance' ? 'Exporting...' : 'Compliance Report'}
          </button>
          <button
            onClick={() => downloadReportPdf('inventory', `inventory_report_${Date.now()}.pdf`, 'inventory')}
            disabled={exportingReport === 'inventory'}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {exportingReport === 'inventory' ? 'Exporting...' : 'Inventory Report'}
          </button>
          <button
            onClick={() => downloadReportPdf('treatment-outcomes', `defaulter_list_${Date.now()}.pdf`, 'outcomes')}
            disabled={exportingReport === 'outcomes'}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
          >
            {exportingReport === 'outcomes' ? 'Exporting...' : 'Defaulter List'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;