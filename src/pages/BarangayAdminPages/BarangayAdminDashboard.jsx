import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { fetchBarangayReport, fetchComplianceTrend } from "../../services/report.service.js";

const PIE_COLORS = {
  Compliant: "#22c55e",
  "At Risk": "#eab308",
  Defaulter: "#ef4444",
};

const DashboardPanel = () => {
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [reportData, trendData] = await Promise.all([
          fetchBarangayReport({ barangay_id: localStorage.getItem('barangay_id') }),
          fetchComplianceTrend({ period: 'monthly', limit: 7 }),
        ]);

        console.log('Barangay report:', JSON.stringify(reportData));
        console.log('Trend data:', JSON.stringify(trendData));

        if (reportData.success) setReport(reportData.data);
        if (trendData.success) setTrend(trendData.data || []);
      } catch (err) {
        setError('Failed to load dashboard data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="animate-in fade-in duration-500 flex items-center justify-center h-64">
      <p className="text-gray-400">Loading dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="animate-in fade-in duration-500 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
      {error}
    </div>
  );

  const summary = report?.patient_summary ?? { total_active: 0, compliant: 0, at_risk: 0, defaulter: 0 };
  const inventory = report?.inventory_summary ?? [];
  const lowStock = inventory.filter(i => i.stock_status === 'Low' || i.stock_status === 'Critical' || i.stock_status === 'Stockout').length;

  const stats = [
    { label: "Total Patients", val: summary.total_active, color: "text-blue-600" },
    { label: "Compliant", val: summary.compliant, color: "text-green-600" },
    { label: "At Risk", val: summary.at_risk, color: "text-orange-500" },
    { label: "Defaulters", val: summary.defaulter, color: "text-red-600" },
    { label: "Low/Critical Stock", val: lowStock, color: "text-orange-600" },
    { label: "Treatment Completed", val: report?.treatment_outcomes?.["Treatment Completed"] ?? 0, color: "text-purple-600" },
  ];

  const pieData = [
    { name: "Compliant", value: summary.compliant },
    { name: "At Risk", value: summary.at_risk },
    { name: "Defaulter", value: summary.defaulter },
  ].filter(d => d.value > 0);

  const barData = trend.length > 0
    ? trend.map(s => ({
        day: new Date(s.snapshot_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        defaulters: s.defaulter_count ?? 0,
      }))
    : [];

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
        <p className="text-gray-500">Overview of your barangay health center</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-800">{stat.val}</div>
            <div className={`text-[11px] font-medium uppercase tracking-wider mt-1 ${stat.color}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-6">Compliance Distribution</h3>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-6">Defaulters Trend</h3>
          {barData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No trend data available</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="defaulters" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Inventory Summary */}
        {inventory.length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Medicine Inventory</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  {["Drug", "Strength", "Remaining Stock", "Status"].map(h => (
                    <th key={h} className="p-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-700">{item.drug_name}</td>
                    <td className="p-3 text-gray-600">{item.strength}</td>
                    <td className="p-3 text-gray-600">{item.remaining_stock?.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                        item.stock_status === 'OK' ? 'bg-green-100 text-green-700' :
                        item.stock_status === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                        item.stock_status === 'Critical' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.stock_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPanel;