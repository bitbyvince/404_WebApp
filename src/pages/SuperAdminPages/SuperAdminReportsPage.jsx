import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { fetchCityReport, fetchComplianceTrend } from "../../services/report.service.js";

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#a855f7"];

const ReportsPanel = () => {
  const [cityReport, setCityReport] = useState(null);
  const [trendData, setTrendData]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [cityData, trendRes] = await Promise.all([
          fetchCityReport(),
          fetchComplianceTrend({ period: 'monthly', limit: 7 }),
        ]);
        if (cityData.success) setCityReport(cityData.data);
        if (trendRes.success) setTrendData(trendRes.data || []);
      } catch (err) {
        setError('Failed to load report data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const barangays   = cityReport?.barangay_breakdown || [];
  const riskSummary = cityReport?.risk_summary || {};

  const summary = {
    overall_compliance_percentage: barangays.length
      ? (barangays.reduce((s, b) => s + (b.compliance_percentage ?? 0), 0) / barangays.length).toFixed(1)
      : 0,
    at_risk_count:   riskSummary.at_risk   ?? 0,
    defaulter_count: riskSummary.defaulter ?? 0,
    total_patients:  cityReport?.total_active_patients ?? 0,
  };

  const barData = barangays.map(b => ({
    name: b.name || b.barangay_id,
    compliance: b.compliance_percentage ?? 0,
  }));

  const stockData = (cityReport?.critical_stock_items || []).map((item, i) => ({
    name: item.drug_name,
    value: item.remaining_stock ?? 0,
    color: COLORS[i % COLORS.length],
  }));

  const lineChartData = trendData.map(t => ({
    month: t.period || t.snapshot_date?.slice(0, 7),
    value: t.compliance_rate ?? t.compliance_percentage ?? t.average_compliance_percentage ?? 0,
  }));

  const [exportingReport, setExportingReport] = useState(null); // 'city' | 'inventory' | 'outcomes' | null

  const downloadReportPdf = async (endpoint, filename, key) => {
    setExportingReport(key);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/${endpoint}?format=pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading reports...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500">Comprehensive municipal analytics</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Overall Compliance", val: `${summary.overall_compliance_percentage ?? 0}%` },
          { label: "Total At Risk",      val: summary.at_risk_count   ?? 0 },
          { label: "Total Defaulters",   val: summary.defaulter_count ?? 0 },
          { label: "Total Patients",     val: summary.total_patients  ?? 0 },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-800">{s.val}</div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Barangay Compliance Comparison</h3>
          {barData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="compliance" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Municipal Stock Distribution</h3>
          {stockData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No stock data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={stockData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Compliance Trend */}
      {lineChartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Monthly Compliance Trend</h3>
          <ResponsiveContainer width="100%" height={256}>
            <LineChart data={lineChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Barangay Performance Table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Barangay Performance Summary</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                {["Barangay", "Compliance %", "At Risk", "Defaulters"].map(h => (
                  <th key={h} className="p-4 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {barangays.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">No data available.</td></tr>
              ) : barangays.map((b, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{b.name || b.barangay_id}</td>
                  <td className="p-4 text-gray-600">{b.compliance_percentage ?? 0}%</td>
                  <td className="p-4 text-orange-500 font-semibold">{b.risk_summary?.at_risk ?? 0}</td>
                  <td className="p-4 text-red-500 font-semibold">{b.risk_summary?.defaulter ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Export Reports</h3>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => downloadReportPdf('city', `municipal_compliance_report_${Date.now()}.pdf`, 'city')}
            disabled={exportingReport === 'city'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:bg-blue-300"
          >
            {exportingReport === 'city' ? 'Exporting...' : 'Municipal Compliance Report'}
          </button>
          <button
            onClick={() => downloadReportPdf('inventory', `barangay_stock_report_${Date.now()}.pdf`, 'inventory')}
            disabled={exportingReport === 'inventory'}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:bg-green-300"
          >
            {exportingReport === 'inventory' ? 'Exporting...' : 'Barangay Stock Report'}
          </button>
          <button
            onClick={() => downloadReportPdf('treatment-outcomes', `defaulter_summary_report_${Date.now()}.pdf`, 'outcomes')}
            disabled={exportingReport === 'outcomes'}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:bg-red-300"
          >
            {exportingReport === 'outcomes' ? 'Exporting...' : 'Defaulter Summary Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;