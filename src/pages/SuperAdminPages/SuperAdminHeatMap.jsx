import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fetchHeatmap, fetchHeatmapHistory } from "../../services/heatmap.service.js";

const riskColor = (level) => {
  if (level === "low")      return { hex: "#22c55e", bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  bar: "bg-green-400" };
  if (level === "moderate") return { hex: "#eab308", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500", bar: "bg-yellow-400" };
  if (level === "high")     return { hex: "#f97316", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", bar: "bg-orange-400" };
  if (level === "critical") return { hex: "#ef4444", bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    bar: "bg-red-400" };
  return { hex: "#9ca3af", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", bar: "bg-gray-300" };
};

const stockBadge = (status) => {
  if (status === "OK")       return "bg-green-100 text-green-700";
  if (status === "Low")      return "bg-yellow-100 text-yellow-700";
  if (status === "Critical") return "bg-orange-100 text-orange-700";
  if (status === "Stockout") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
};

const PERIODS = [
  { value: "daily",     label: "Current Month" },
  { value: "monthly",   label: "Last 3 Months" },
  { value: "all_time",  label: "Full Treatment Period" },
];



const HeatMapPanel = () => {
  const [snapshots, setSnapshots]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [period, setPeriod]                 = useState("monthly");
  const [search, setSearch]                 = useState("");
  const [sortBy, setSortBy]                 = useState("heat_intensity");
  const [selected, setSelected]             = useState(null);
  const [history, setHistory]               = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [view, setView]                     = useState("map"); // "map" | "list"
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchHeatmap({ period });
        if (data.success) {
          const raw = data.data ?? [];
          setSnapshots(Array.isArray(raw) ? raw : []);
        } else {
          setError(data.message || "Failed to load heatmap.");
        }
      } catch {
        setError("Connection error.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  useEffect(() => {
    if (!selected) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await fetchHeatmapHistory(selected.barangay_id, {
          period,
          limit: 12,
          health_center_id: selected.health_center_id,
        });
        if (data.success) {
          const raw = data.data ?? [];
          setHistory(Array.isArray(raw) ? raw : []);
        }
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [selected, period]);

  const filtered = snapshots
    .filter(s => {
      const q = search.toLowerCase();
      return s.barangay_name?.toLowerCase().includes(q) || s.health_center_name?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "compliance_rate") return a.compliance_rate - b.compliance_rate;
      if (sortBy === "active_cases")    return b.active_cases - a.active_cases;
      return b.heat_intensity - a.heat_intensity;
    });

  const totalCases      = snapshots.reduce((s, b) => s + (b.active_cases ?? 0), 0);
  const totalDefaulters = snapshots.reduce((s, b) => s + (b.defaulter_count ?? 0), 0);
  const totalAtRisk     = snapshots.reduce((s, b) => s + (b.at_risk_count ?? 0), 0);
  const criticalCount   = snapshots.filter(b => b.risk_level === "critical").length;
  const avgCompliance   = snapshots.length
    ? (snapshots.reduce((s, b) => s + (b.compliance_rate ?? 0), 0) / snapshots.length).toFixed(1)
    : 0;

  // Derive map center from snapshots
  const mapCenter = snapshots.length > 0 && snapshots[0].coordinates?.coordinates
    ? [snapshots[0].coordinates.coordinates[1], snapshots[0].coordinates.coordinates[0]]
    : [14.568, 121.080]; // fallback: Pasig area

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Compliance Heat Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">Municipality-wide TB compliance overview by health center</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            {["map", "list"].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                  view === v ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v === "map" ? "🗺 Map" : "☰ List"}
              </button>
            ))}
          </div>
          {/* Period Toggle */}
         {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => { setPeriod(p.value); setSelected(null); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
              period === p.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"
            }`}
          >
            {p.label}
          </button>
        ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Active Cases",   val: totalCases,          color: "text-blue-600",   accent: "border-l-blue-400" },
          { label: "At Risk",              val: totalAtRisk,         color: "text-yellow-600", accent: "border-l-yellow-400" },
          { label: "Defaulters",           val: totalDefaulters,     color: "text-red-600",    accent: "border-l-red-400" },
          { label: "Critical Facilities",  val: criticalCount,       color: "text-orange-600", accent: "border-l-orange-400" },
          { label: "Avg Compliance",       val: `${avgCompliance}%`, color: "text-green-600",  accent: "border-l-green-400" },
        ].map((c, i) => (
          <div key={i} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${c.accent} shadow-sm p-4 transition hover:shadow-md`}>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">

        {/* MAP VIEW */}
        {view === "map" && (
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Legend */}
            <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-semibold text-gray-600 mr-1">Risk:</span>
              {["low", "moderate", "high", "critical"].map(l => {
                const c = riskColor(l);
                return (
                  <span key={l} className="flex items-center gap-1 capitalize">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`}></span> {l}
                  </span>
                );
              })}
              <span className="ml-auto text-gray-400 italic flex items-center gap-2">
                <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                  {PERIODS.find(p => p.value === period)?.label}
                </span>
                Click a health center marker for details
              </span>
            </div>

            {loading ? (
              <div className="h-[520px] flex items-center justify-center text-gray-400 text-sm">
                Loading map data...
              </div>
            ) : (
              <MapContainer
                center={mapCenter}
                zoom={14}
                style={{ height: "520px", width: "100%" }}
                className="z-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* One boundary outline per barangay (not per facility) — colored
                    by that barangay's worst risk level across all its health
                    centers, so barangays with several facilities don't get
                    the same polygon drawn on top of itself repeatedly. */}
                {Object.values(
                  snapshots.reduce((acc, s) => {
                    if (!s.boundary_geojson?.coordinates) return acc;
                    const rank = { low: 0, moderate: 1, high: 2, critical: 3 };
                    const existing = acc[s.barangay_id];
                    if (!existing || rank[s.risk_level] > rank[existing.risk_level]) {
                      acc[s.barangay_id] = s;
                    }
                    return acc;
                  }, {})
                ).map((brgy) => {
                  const c = riskColor(brgy.risk_level);
                  const polygonCoords = brgy.boundary_geojson.coordinates[0].map(([lng, lat]) => [lat, lng]);
                  return (
                    <Polygon
                      key={`boundary-${brgy.barangay_id}`}
                      positions={polygonCoords}
                      pathOptions={{ color: c.hex, fillColor: c.hex, fillOpacity: 0.12, weight: 1 }}
                    />
                  );
                })}

                {snapshots.map((hc) => {
                  if (!hc.coordinates?.coordinates) return null;
                  const [lng, lat] = hc.coordinates.coordinates;
                  const c = riskColor(hc.risk_level);
                  const isSelected = selected?.health_center_id === hc.health_center_id;

                  return (
                    <CircleMarker
                      key={hc.health_center_id}
                      center={[lat, lng]}
                      radius={9 + (hc.heat_intensity ?? 0) * 13}
                      pathOptions={{
                        color: isSelected ? "#1d4ed8" : "#fff",
                        fillColor: c.hex,
                        fillOpacity: 0.85,
                        weight: isSelected ? 3 : 1.5,
                      }}
                      eventHandlers={{ click: () => setSelected(isSelected ? null : hc) }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1.5 min-w-[170px]">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm text-gray-800 leading-tight">{hc.health_center_name}</p>
                            <span className={`shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                              {hc.risk_level}
                            </span>
                          </div>
                          <p className="text-gray-400">Brgy. {hc.barangay_name}</p>
                          <hr />
                          <p>Compliance: <b className="text-blue-600">{hc.compliance_rate}%</b></p>
                          <p>Active Cases: <b>{hc.active_cases}</b></p>
                          <p>At Risk: <b className="text-yellow-600">{hc.at_risk_count}</b></p>
                          <p>Defaulters: <b className="text-red-500">{hc.defaulter_count}</b></p>
                          <p>Stock: <b>{hc.stock_status}</b></p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center gap-3">
              <input
                type="text"
                placeholder="Search health center or barangay..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="heat_intensity">Sort: Heat Intensity</option>
                <option value="compliance_rate">Sort: Compliance (asc)</option>
                <option value="active_cases">Sort: Active Cases</option>
              </select>
            </div>

            <div className="px-5 py-2 border-b bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
              {["low", "moderate", "high", "critical"].map(l => {
                const c = riskColor(l);
                return (
                  <span key={l} className="flex items-center gap-1 capitalize">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`}></span> {l}
                  </span>
                );
              })}
            </div>

            <div className="divide-y max-h-[520px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No health centers found.</div>
              ) : filtered.map((hc) => {
                const c = riskColor(hc.risk_level);
                const isSelected = selected?.health_center_id === hc.health_center_id;
                return (
                  <div
                    key={hc.health_center_id}
                    onClick={() => setSelected(isSelected ? null : hc)}
                    className={`px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50 ${isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot}`}></span>
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-800 text-sm block truncate">{hc.health_center_name}</span>
                          <span className="text-[11px] text-gray-400">Brgy. {hc.barangay_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.bg} ${c.text}`}>
                          {hc.risk_level}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${stockBadge(hc.stock_status)}`}>
                          Stock: {hc.stock_status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${c.bar}`} style={{ width: `${hc.compliance_rate ?? 0}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{hc.compliance_rate ?? 0}%</span>
                    </div>
                    <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                      <span>Cases: <b className="text-gray-700">{hc.active_cases}</b></span>
                      <span>At Risk: <b className="text-yellow-600">{hc.at_risk_count}</b></span>
                      <span>Defaulters: <b className="text-red-500">{hc.defaulter_count}</b></span>
                      <span>Esc L3: <b className="text-orange-600">{hc.escalation_counts?.level_3 ?? 0}</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{selected.health_center_name || "—"}</h3>
                <p className="text-xs text-gray-400">Brgy. {selected.barangay_name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0 ml-2">×</button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-3">
                <div className={`flex-1 rounded-lg p-3 ${riskColor(selected.risk_level).bg}`}>
                  <p className="text-xs text-gray-500">Risk Level</p>
                  <p className={`text-lg font-bold capitalize ${riskColor(selected.risk_level).text}`}>{selected.risk_level}</p>
                </div>
                <div className="flex-1 rounded-lg p-3 bg-blue-50">
                  <p className="text-xs text-gray-500">Compliance</p>
                  <p className="text-lg font-bold text-blue-600">{selected.compliance_rate}%</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Patient Breakdown</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Active Cases", val: selected.active_cases,    color: "text-blue-600" },
                    { label: "At Risk",      val: selected.at_risk_count,   color: "text-yellow-600" },
                    { label: "Defaulters",   val: selected.defaulter_count, color: "text-red-600" },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{r.label}</span>
                      <span className={`font-semibold ${r.color}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Open Escalations</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(lvl => (
                    <div key={lvl} className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400">Level {lvl}</p>
                      <p className={`text-xl font-bold ${lvl === 3 ? "text-red-500" : lvl === 2 ? "text-orange-500" : "text-yellow-500"}`}>
                        {selected.escalation_counts?.[`level_${lvl}`] ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Status</p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${stockBadge(selected.stock_status)}`}>
                  {selected.stock_status}
                </span>
              </div>

              <button
                onClick={() => navigate(`/dashboard/barangays/${selected.barangay_id}`, {
                  state: { returnPanel: "Heat Map" }
                })}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                View Barangay Details
              </button>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Heat Intensity</p>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all"
                    style={{ width: `${(selected.heat_intensity ?? 0) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{((selected.heat_intensity ?? 0) * 100).toFixed(1)}%</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Compliance Trend</p>
                {loadingHistory ? (
                  <p className="text-xs text-gray-400">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-gray-400">No history available.</p>
                ) : (
                  <div className="flex items-end gap-1 h-16">
                    {history.map((h, i) => {
                      const c = riskColor(h.risk_level);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div
                            className={`w-full rounded-sm ${c.bar} transition-all`}
                            style={{ height: `${h.compliance_rate ?? 0}%`, minHeight: "4px" }}
                          />
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] bg-gray-800 text-white px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                            {h.compliance_rate}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeatMapPanel;