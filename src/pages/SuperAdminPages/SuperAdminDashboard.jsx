import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { fetchCityReport, fetchComplianceTrend } from "../../services/report.service.js";
import { fetchInventory } from "../../services/inventory.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const COLORS = ["#22c55e", "#eab308", "#ef4444"];

const DashboardPanel = () => {
  const [cityReport, setCityReport] = useState(null);
  const [trendData, setTrendData]   = useState([]);
  const [totalStock, setTotalStock] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [filters, setFilters] = useState({ barangay_id: '', from: '', to: '' });

  useEffect(() => {
    const loadBarangays = async () => {
      try {
        const data = await fetchBarangays();
        if (data.success) setBarangayOptions(data.barangays || []);
      } catch (err) {
        console.error('Failed to fetch barangays:', err);
      }
    };
    loadBarangays();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [cityRes, trendRes, inventoryRes] = await Promise.all([
          fetchCityReport({ from: filters.from || undefined, to: filters.to || undefined }),
          fetchComplianceTrend({ barangay_id: filters.barangay_id || undefined, period: "monthly", limit: 7, from: filters.from || undefined, to: filters.to || undefined }),
          fetchInventory({ limit: 100, barangay_id: filters.barangay_id || undefined }),
        ]);
        if (cityRes.success)      setCityReport(cityRes.data);
        if (trendRes.success)     setTrendData(Array.isArray(trendRes.data) ? trendRes.data : []);
        if (inventoryRes.success) {
          const items = inventoryRes.data?.inventory ?? inventoryRes.data ?? [];
          const stock = Array.isArray(items)
            ? items.reduce((s, i) => s + (i.remaining_stock ?? 0), 0)
            : 0;
          setTotalStock(stock);
        }
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.barangay_id, filters.from, filters.to]);

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));
  const clearFilters = () => setFilters({ barangay_id: '', from: '', to: '' });
  const hasActiveFilters = filters.barangay_id || filters.from || filters.to;

  const allBarangays   = cityReport?.barangay_breakdown || [];
  const barangays = filters.barangay_id
    ? allBarangays.filter(b => b.barangay_id === filters.barangay_id)
    : allBarangays;
  const riskSummary    = filters.barangay_id
    ? barangays.reduce((acc, b) => ({
        compliant: acc.compliant + (b.risk_summary?.compliant ?? 0),
        at_risk: acc.at_risk + (b.risk_summary?.at_risk ?? 0),
        defaulter: acc.defaulter + (b.risk_summary?.defaulter ?? 0),
      }), { compliant: 0, at_risk: 0, defaulter: 0 })
    : (cityReport?.risk_summary || {});
  const totalPatients  = filters.barangay_id
    ? barangays.reduce((s, b) => s + (b.total_active ?? 0), 0)
    : (cityReport?.total_active_patients ?? 0);
  const totalBarangays = barangays.length;

  const overallCompliance = barangays.length
    ? (barangays.reduce((s, b) => s + (b.compliance_percentage ?? 0), 0) / barangays.length).toFixed(1)
    : 0;

  const barData  = barangays.map(b => ({ name: b.name || b.barangay_id, compliance: b.compliance_percentage ?? 0 }));
  const lineData = trendData.map(t => ({
    month: t.snapshot_date?.slice(0, 7) || "—",
    value: t.compliance_rate ?? t.compliance_percentage ?? 0,
  }));
  const pieData = [
    { name: "Compliant", value: riskSummary.compliant ?? 0, color: "#22c55e" },
    { name: "At Risk",   value: riskSummary.at_risk   ?? 0, color: "#eab308" },
    { name: "Defaulter", value: riskSummary.defaulter  ?? 0, color: "#ef4444" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Municipal Dashboard</h1>
        <p className="text-gray-500">Overview of all barangay health centers</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-3 flex-wrap items-center">
          <select value={filters.barangay_id} onChange={(e) => setFilters(prev => ({ ...prev, barangay_id: e.target.value, from: '', to: '' }))} className="border rounded-lg px-3 py-2 text-sm outline-none">
            <option value="">All Barangays</option>
            {barangayOptions.map((b) => <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            From
            <input type="date" value={filters.from} onChange={(e) => handleFilterChange('from', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
            to
            <input type="date" value={filters.to} onChange={(e) => handleFilterChange('to', e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
          </label>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: "Total Barangays",    val: totalBarangays,              color: "text-blue-600" },
          { label: "TB Patients",        val: totalPatients,               color: "text-blue-600" },
          { label: "Overall Compliance", val: `${overallCompliance}%`,     color: "text-green-600" },
          { label: "At Risk",            val: riskSummary.at_risk   ?? 0,  color: "text-orange-500" },
          { label: "Defaulters",         val: riskSummary.defaulter ?? 0,  color: "text-red-600" },
          { label: "Municipal Stock",    val: totalStock.toLocaleString(), color: "text-blue-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.val}</div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Compliance per Barangay</h3>
          {barData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available.</div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="compliance" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700 mb-6">Monthly Compliance Trend</h3>
          {lineData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No trend data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={lineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#9ca3af" }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: "white", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Municipal Risk Distribution</h3>
        {totalPatients === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No patient data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Barangay Breakdown Table */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Barangay Breakdown</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {["Barangay", "Health Center", "Active Cases", "Compliant", "At Risk", "Defaulters", "Compliance %", "Risk Level"].map(h => (
                  <th key={h} className="p-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {barangays.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-gray-400">No data available.</td></tr>
              ) : barangays.map((b, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{b.name || b.barangay_id}</td>
                  <td className="p-4 text-gray-500 text-xs">{b.health_center_name || "—"}</td>
                  <td className="p-4 text-gray-700 font-semibold">{b.total_active ?? 0}</td>
                  <td className="p-4 text-green-600 font-semibold">{b.risk_summary?.compliant ?? 0}</td>
                  <td className="p-4 text-yellow-600 font-semibold">{b.risk_summary?.at_risk ?? 0}</td>
                  <td className="p-4 text-red-500 font-semibold">{b.risk_summary?.defaulter ?? 0}</td>
                  <td className="p-4 text-gray-700">{b.compliance_percentage ?? 0}%</td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${
                      b.risk_level === "low"      ? "bg-green-100 text-green-700" :
                      b.risk_level === "moderate" ? "bg-yellow-100 text-yellow-700" :
                      b.risk_level === "high"     ? "bg-orange-100 text-orange-700" :
                      b.risk_level === "critical" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {b.risk_level ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;