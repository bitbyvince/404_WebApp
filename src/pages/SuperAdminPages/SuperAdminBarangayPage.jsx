import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBarangays, createBarangayAdmin, createBarangay, addHealthCenter } from "../../services/barangay.service.js";
import { fetchStockRequestAlerts } from "../../services/alert.service.js";

const stockBadge = (status) => {
  if (status === "OK") return "bg-green-100 text-green-700";
  if (status === "Low") return "bg-yellow-100 text-yellow-700";
  if (status === "Critical") return "bg-orange-100 text-orange-700";
  if (status === "Stockout") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

// Auto-builds a small square boundary polygon around a center point,
// since the backend requires a boundary_geojson but this form only
// collects one center coordinate. Redraw properly later if needed.
const buildSquareBoundary = (lat, lng, delta = 0.003) => {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return {
    type: "Polygon",
    coordinates: [[
      [ln - delta, la - delta],
      [ln + delta, la - delta],
      [ln + delta, la + delta],
      [ln - delta, la + delta],
      [ln - delta, la - delta],
    ]],
  };
};

const BarangaysPanel = () => {
  const navigate = useNavigate();
  const [barangays, setBarangays] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);


  const loadBarangays = async () => {
    try {
      const data = await fetchBarangays({ includeStats: true });
      if (data.success) setBarangays(data.barangays);
    } catch (err) {
      console.error('Failed to fetch barangays:', err);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await fetchStockRequestAlerts();
      if (data.success) {
        setStockAlerts(data.data.alerts.filter((a) => a.status !== 'Resolved'));
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const getStockRequestCount = (barangayId) =>
    stockAlerts.filter((a) => a.barangay_id === barangayId).length;

  useEffect(() => {
    loadBarangays();
    loadAlerts();
  }, []);

  // Flatten barangays -> one entry per health center, since a barangay
  // can now have more than one. Barangay-wide stats (patients, compliance,
  // stock) are shown on every health center card that belongs to it —
  // those aggregates aren't split per-facility yet.
  const healthCenters = barangays.flatMap((b) =>
    (b.health_centers || []).map((hc) => ({
      barangay_id: b.barangay_id,
      barangay_name: b.name,
      municipality: b.municipality,
      province: b.province,
      stats: b.stats,
      health_center_id: hc.health_center_id,
      health_center_name: hc.name,
      health_center_address: hc.address,
      health_center_contact_number: hc.contact_number,
    }))
  );

  // ── Create Barangay Admin ──────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'barangay_admin',
    barangay_id: '',
    barangay_name: '',
    health_center_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);
    setSuccess('');

    try {
      const data = await createBarangayAdmin({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: form.role,
        barangay_id: form.barangay_id,
        barangay_name: form.barangay_name,
        health_center_id: form.health_center_id,
      });

      if (data.success) {
        setSuccess('Health center admin created successfully!');
        setForm({ first_name: '', last_name: '', email: '', password: '', role: 'barangay_admin', barangay_id: '', barangay_name: '', health_center_id: '' });
      } else {
        setErrors(data.errors?.map(e => e.message) || [data.message || 'Failed to create account.']);
      }
    } catch (err) {
      setErrors(['Connection error.']);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Add Health Center ─────────────────────────────────────────
  // Two modes: add a facility to an existing barangay (the common
  // case, since a barangay can have more than one health center),
  // or create a brand-new barangay along with its first facility.
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [addMode, setAddMode] = useState('existing'); // 'existing' | 'new'
  const [barangayForm, setBarangayForm] = useState({
    target_barangay_id: '',
    name: '',
    municipality: '',
    province: '',
    health_center_name: '',
    health_center_address: '',
    health_center_contact_number: '',
    lat: '',
    lng: '',
  });
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [barangayErrors, setBarangayErrors] = useState([]);
  const [barangaySuccess, setBarangaySuccess] = useState('');

  const handleBarangayChange = (e) => {
    setBarangayForm({ ...barangayForm, [e.target.name]: e.target.value });
  };

  const resetBarangayForm = () => setBarangayForm({
    target_barangay_id: '', name: '', municipality: '', province: '',
    health_center_name: '', health_center_address: '', health_center_contact_number: '',
    lat: '', lng: '',
  });

  const handleAddHealthCenter = async (e) => {
    e.preventDefault();
    setBarangayLoading(true);
    setBarangayErrors([]);
    setBarangaySuccess('');

    try {
      const data = addMode === 'existing'
        ? await addHealthCenter(barangayForm.target_barangay_id, {
            name: barangayForm.health_center_name,
            address: barangayForm.health_center_address,
            contact_number: barangayForm.health_center_contact_number,
          })
        : await createBarangay({
            name: barangayForm.name,
            municipality: barangayForm.municipality,
            province: barangayForm.province,
            health_centers: [{
              name: barangayForm.health_center_name,
              address: barangayForm.health_center_address,
              contact_number: barangayForm.health_center_contact_number,
            }],
            coordinates: {
              type: 'Point',
              coordinates: [parseFloat(barangayForm.lng), parseFloat(barangayForm.lat)],
            },
            boundary_geojson: buildSquareBoundary(barangayForm.lat, barangayForm.lng),
          });

      if (data.success) {
        setBarangaySuccess('Health center added successfully!');
        resetBarangayForm();
        loadBarangays();
      } else {
        setBarangayErrors(data.errors?.map(e => e.message) || [data.message || 'Failed to add health center.']);
      }
    } catch (err) {
      setBarangayErrors(['Connection error.']);
      console.error(err);
    } finally {
      setBarangayLoading(false);
    }
  };

  // ── Search ───────────────────────────────────────────────────
  const [search, setSearch] = useState('');

  return (
    <div className="animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Health Centers</h1>
          <p className="text-gray-500">Overview of all health centers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
          >
            + Create Health Center Admin
          </button>
          <button
            onClick={() => {
              if (!barangayForm.municipality && !barangayForm.province && barangays[0]) {
                setBarangayForm({
                  ...barangayForm,
                  municipality: barangays[0].municipality || '',
                  province: barangays[0].province || '',
                });
              }
              setShowBarangayModal(true);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
          >
            + Add Health Center
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by health center or barangay name..."
          className="w-full max-w-md rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Health Center Cards — one per facility, not per barangay */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {healthCenters
          .filter((hc) => {
            const q = search.trim().toLowerCase();
            if (!q) return true;
            return (
              hc.health_center_name?.toLowerCase().includes(q) ||
              hc.barangay_name?.toLowerCase().includes(q)
            );
          })
          .map((hc) => (
          <div
            key={hc.health_center_id}
            onClick={() => navigate(`/dashboard/barangays/${hc.barangay_id}`)}
            className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
          >
            {getStockRequestCount(hc.barangay_id) > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow z-10">
                {getStockRequestCount(hc.barangay_id)}
              </span>
            )}
            <div className="border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">{hc.health_center_name}</h3>
              <p className="text-xs text-gray-400">
                Brgy. {hc.barangay_name} &middot; {hc.municipality}, {hc.province}
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total Patients", val: hc.stats?.total_patients ?? 0 },
                { label: "Compliance", val: `${hc.stats?.compliance_percentage ?? 0}%` },
                { label: "At Risk", val: hc.stats?.at_risk_count ?? 0 },
                { label: "Defaulters", val: hc.stats?.defaulter_count ?? 0 },
              ].map((item, j) => (
                <div key={j} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-bold text-gray-800">{item.val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-500 text-sm">Stock</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${stockBadge(hc.stats?.stock_status)}`}>
                  {hc.stats?.stock_status ?? 'OK'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Barangay Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Create Health Center Admin</h2>
              <button
                onClick={() => { setShowModal(false); setErrors([]); setSuccess(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm space-y-1">
                {errors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-600">First Name</label>
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    placeholder="Juan"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600">Last Name</label>
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    placeholder="Dela Cruz"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="admin@tbmonitoring.gov.ph"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="Min. 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600">Health Center</label>
                <select
                  name="health_center_id"
                  value={form.health_center_id}
                  onChange={(e) => {
                    const selected = healthCenters.find(hc => hc.health_center_id === e.target.value);
                    setForm({
                      ...form,
                      barangay_id: selected?.barangay_id || '',
                      barangay_name: selected?.barangay_name || '',
                      health_center_id: selected?.health_center_id || '',
                    });
                  }}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select Health Center</option>
                  {healthCenters.map((hc) => (
                    <option key={hc.health_center_id} value={hc.health_center_id}>
                      {hc.health_center_name} — {hc.barangay_name}
                    </option>
                  ))}
                </select>
                {form.health_center_id && (
                  <p className="mt-1 text-xs text-gray-400">
                    Health Center: <span className="font-medium text-gray-600">{form.health_center_id}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setErrors([]); setSuccess(''); }}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:bg-green-400"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Health Center Modal */}
      {showBarangayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add Health Center</h2>
              <button
                onClick={() => { setShowBarangayModal(false); setBarangayErrors([]); setBarangaySuccess(''); resetBarangayForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Mode toggle: most health centers belong to an existing
                barangay; "new barangay" is only for a barangay that
                isn't in the system yet. */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => { setAddMode('existing'); setBarangayErrors([]); setBarangaySuccess(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${addMode === 'existing' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Existing Barangay
              </button>
              <button
                type="button"
                onClick={() => { setAddMode('new'); setBarangayErrors([]); setBarangaySuccess(''); }}
                className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${addMode === 'new' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
              >
                New Barangay
              </button>
            </div>

            {barangayErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm space-y-1">
                {barangayErrors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
            {barangaySuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {barangaySuccess}
              </div>
            )}

            <form onSubmit={handleAddHealthCenter} className="space-y-4">
              {addMode === 'existing' ? (
                <div>
                  <label className="text-xs text-zinc-600">Barangay</label>
                  <select
                    name="target_barangay_id"
                    value={barangayForm.target_barangay_id}
                    onChange={handleBarangayChange}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="">Select barangay</option>
                    {barangays.map((b) => (
                      <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400">
                    This facility will be added alongside any health center(s) this barangay already has.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-zinc-600">Barangay Name</label>
                    <input
                      name="name"
                      value={barangayForm.name}
                      onChange={handleBarangayChange}
                      required
                      placeholder="San Miguel"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-600">Municipality</label>
                      <input
                        name="municipality"
                        value={barangayForm.municipality}
                        onChange={handleBarangayChange}
                        required
                        placeholder="Pasig"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-600">Province</label>
                      <input
                        name="province"
                        value={barangayForm.province}
                        onChange={handleBarangayChange}
                        required
                        placeholder="Metro Manila"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-zinc-500 mb-2">Health Center</p>
                <p className="mt-1 mb-2 text-xs text-gray-400">Health Center ID is generated automatically.</p>
                <div>
                  <label className="text-xs text-zinc-600">Health Center Name</label>
                  <input
                    name="health_center_name"
                    value={barangayForm.health_center_name}
                    onChange={handleBarangayChange}
                    required
                    placeholder="San Miguel Health Center"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="mt-4">
                  <label className="text-xs text-zinc-600">Address</label>
                  <input
                    name="health_center_address"
                    value={barangayForm.health_center_address}
                    onChange={handleBarangayChange}
                    required
                    placeholder="123 Main St, San Miguel"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="mt-4">
                  <label className="text-xs text-zinc-600">Contact Number</label>
                  <input
                    name="health_center_contact_number"
                    value={barangayForm.health_center_contact_number}
                    onChange={handleBarangayChange}
                    required
                    pattern="(\+63|0)9\d{9}"
                    placeholder="+639171234567"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              </div>

              {addMode === 'new' && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-zinc-500 mb-2">Map Center</p>
                  <p className="text-xs text-gray-400 mb-2">
                    Used to place this barangay on the Heat Map. A small placeholder boundary is generated automatically around this point.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-600">Latitude</label>
                      <input
                        name="lat"
                        type="number"
                        step="any"
                        value={barangayForm.lat}
                        onChange={handleBarangayChange}
                        required
                        placeholder="14.5995"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-600">Longitude</label>
                      <input
                        name="lng"
                        type="number"
                        step="any"
                        value={barangayForm.lng}
                        onChange={handleBarangayChange}
                        required
                        placeholder="120.9842"
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBarangayModal(false); setBarangayErrors([]); setBarangaySuccess(''); resetBarangayForm(); }}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={barangayLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:bg-purple-400"
                >
                  {barangayLoading ? 'Adding...' : 'Add Health Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BarangaysPanel;