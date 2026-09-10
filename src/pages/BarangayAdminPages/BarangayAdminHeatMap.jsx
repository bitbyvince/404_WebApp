import { useState, useEffect } from "react";
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
  { value: "daily",    label: "Current Month" },
  { value: "monthly",  label: "Last 3 Months" },
  { value: "all_time", label: "Full Treatment Period" },
];

const HeatMapPanel = () => {
  const [snapshot, setSnapshot]             = useState(null);
  const [history, setHistory]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError]                   = useState("");
  const [period, setPeriod]                 = useState("monthly");
  const [view, setView]                     = useState("map");

  const admin           = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id     = admin.barangay_id;
  const health_center_id = admin.health_center_id;

  // Load heatmap filtered to this specific health center (a barangay can
  // have more than one, so barangay_id alone isn't enough to identify
  // "my clinic's" snapshot).
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchHeatmap({ period, barangay_id, health_center_id });
        if (data.success) {
          const raw = data.data ?? [];
          const list = Array.isArray(raw) ? raw : [];
          const mine = list.find(s => s.health_center_id === health_center_id) || list[0] || null;
          setSnapshot(mine);
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
  }, [period, barangay_id, health_center_id]);

  // Load history for this health center
  useEffect(() => {
    if (!barangay_id) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await fetchHeatmapHistory(barangay_id, { period, limit: 12, health_center_id });
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
  }, [period, barangay_id, health_center_id]);

  const mapCenter = snapshot?.coordinates?.coordinates
    ? [snapshot.coordinates.coordinates[1], snapshot.coordinates.coordinates[0]]
    : [14.568, 121.080];

  const c = riskColor(snapshot?.risk_level);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Compliance Heat Map</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {admin.barangay_name || 'Barangay'} TB compliance overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
            {["map", "details"].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition ${
                  view === v ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {v === "map" ? "🗺 Map" : "📊 Details"}
              </button>
            ))}
          </div>
          {/* Period Toggle */}
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
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
      {snapshot && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Active Cases",    val: snapshot.active_cases ?? 0,    color: "text-blue-600" },
            { label: "At Risk",         val: snapshot.at_risk_count ?? 0,   color: "text-yellow-600" },
            { label: "Defaulters",      val: snapshot.defaulter_count ?? 0, color: "text-red-600" },
            { label: "Risk Level",      val: snapshot.risk_level ?? '—',    color: c.text },
            { label: "Compliance Rate", val: `${snapshot.compliance_rate ?? 0}%`, color: "text-green-600" },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold capitalize ${card.color}`}>{card.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* MAP VIEW */}
      {view === "map" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
            <span className="font-semibold text-gray-600 mr-1">Risk:</span>
            {["low", "moderate", "high", "critical"].map(l => {
              const rc = riskColor(l);
              return (
                <span key={l} className="flex items-center gap-1 capitalize">
                  <span className={`w-2.5 h-2.5 rounded-full ${rc.dot}`}></span> {l}
                </span>
              );
            })}
          <span className="ml-auto">
          <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-blue-100">
            {PERIODS.find(p => p.value === period)?.label}
          </span>
        </span>
      </div>

          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-gray-400 text-sm">
              Loading map data...
            </div>
          ) : !snapshot ? (
            <div className="h-[520px] flex items-center justify-center text-gray-400 text-sm">
              No map data available.
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ height: "520px", width: "100%" }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {snapshot.coordinates?.coordinates && (() => {
                const [lng, lat] = snapshot.coordinates.coordinates;
                const polygonCoords = snapshot.boundary_geojson?.coordinates?.[0]?.map(
                  ([lng, lat]) => [lat, lng]
                );
                return (
                  <>
                    {polygonCoords && (
                      <Polygon
                        positions={polygonCoords}
                        pathOptions={{
                          color: c.hex,
                          fillColor: c.hex,
                          fillOpacity: 0.25,
                          weight: 2,
                        }}
                      />
                    )}
                    <CircleMarker
                      center={[lat, lng]}
                      radius={16 + (snapshot.heat_intensity ?? 0) * 14}
                      pathOptions={{
                        color: c.hex,
                        fillColor: c.hex,
                        fillOpacity: 0.8,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 min-w-[160px]">
                          <p className="font-bold text-sm text-gray-800">{snapshot.barangay_name}</p>
                          <p className="text-gray-500">{snapshot.health_center_name}</p>
                          <hr />
                          <p>Compliance: <b className="text-blue-600">{snapshot.compliance_rate}%</b></p>
                          <p>Active Cases: <b>{snapshot.active_cases}</b></p>
                          <p>At Risk: <b className="text-yellow-600">{snapshot.at_risk_count}</b></p>
                          <p>Defaulters: <b className="text-red-500">{snapshot.defaulter_count}</b></p>
                          <p>Stock: <b>{snapshot.stock_status}</b></p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  </>
                );
              })()}
            </MapContainer>
          )}
        </div>
      )}

      {/* DETAILS VIEW */}
      {view === "details" && snapshot && (
        <div className="grid grid-cols-2 gap-6">

          {/* Patient Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Patient Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Active Cases", val: snapshot.active_cases,    color: "text-blue-600" },
                { label: "At Risk",      val: snapshot.at_risk_count,   color: "text-yellow-600" },
                { label: "Defaulters",   val: snapshot.defaulter_count, color: "text-red-600" },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{r.label}</span>
                  <span className={`text-xl font-bold ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Escalations */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Open Escalations</h3>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(lvl => (
                <div key={lvl} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">Level {lvl}</p>
                  <p className={`text-2xl font-bold ${lvl === 3 ? "text-red-500" : lvl === 2 ? "text-orange-500" : "text-yellow-500"}`}>
                    {snapshot.escalation_counts?.[`level_${lvl}`] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stock + Heat Intensity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Stock & Heat</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stock Status</span>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${stockBadge(snapshot.stock_status)}`}>
                  {snapshot.stock_status}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Heat Intensity</span>
                  <span>{((snapshot.heat_intensity ?? 0) * 100).toFixed(1)}%</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-red-500"
                    style={{ width: `${(snapshot.heat_intensity ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Compliance Trend */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Compliance Trend</h3>
            {loadingHistory ? (
              <p className="text-xs text-gray-400">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-gray-400">No history available.</p>
            ) : (
              <div className="flex items-end gap-1 h-20">
                {history.map((h, i) => {
                  const rc = riskColor(h.risk_level);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-sm ${rc.bar}`}
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
      )}

    </div>
  );
};

export default HeatMapPanel;