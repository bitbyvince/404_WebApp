import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBarangays, createBarangayAdmin, createBarangay, createPatcAccount } from "../../services/barangay.service.js";
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

  const currentRole = (() => {
    try {
      return JSON.parse(localStorage.getItem('admin') || '{}').role;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentRole === 'super_admin';

  const loadBarangays = async () => {
    try {
      const data = await fetchBarangays();
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
        setSuccess('Barangay admin created successfully!');
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

  // ── Add Barangay ────────────────────────────────────────────
  const [showBarangayModal, setShowBarangayModal] = useState(false);
  const [barangayForm, setBarangayForm] = useState({
    name: '',
    municipality: '',
    province: '',
    health_center_id: '',
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

  const handleCreateBarangay = async (e) => {
    e.preventDefault();
    setBarangayLoading(true);
    setBarangayErrors([]);
    setBarangaySuccess('');

    try {
      const data = await createBarangay({
        name: barangayForm.name,
        municipality: barangayForm.municipality,
        province: barangayForm.province,
        health_center: {
          health_center_id: barangayForm.health_center_id,
          name: barangayForm.health_center_name,
          address: barangayForm.health_center_address,
          contact_number: barangayForm.health_center_contact_number,
        },
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(barangayForm.lng), parseFloat(barangayForm.lat)],
        },
        boundary_geojson: buildSquareBoundary(barangayForm.lat, barangayForm.lng),
      });

      if (data.success) {
        setBarangaySuccess('Barangay created successfully!');
        setBarangayForm({
          name: '', municipality: barangayForm.municipality, province: barangayForm.province,
          health_center_id: '', health_center_name: '', health_center_address: '', health_center_contact_number: '',
          lat: '', lng: '',
        });
        loadBarangays();
      } else {
        setBarangayErrors(data.errors?.map(e => e.message) || [data.message || 'Failed to create barangay.']);
      }
    } catch (err) {
      setBarangayErrors(['Connection error.']);
      console.error(err);
    } finally {
      setBarangayLoading(false);
    }
  };

  // ── Create PATC Account ─────────────────────────────────────
  const [showPatcModal, setShowPatcModal] = useState(false);
  const [patcForm, setPatcForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [patcLoading, setPatcLoading] = useState(false);
  const [patcErrors, setPatcErrors] = useState([]);
  const [patcSuccess, setPatcSuccess] = useState('');

  const handlePatcChange = (e) => {
    setPatcForm({ ...patcForm, [e.target.name]: e.target.value });
  };

  const handleCreatePatc = async (e) => {
    e.preventDefault();
    setPatcLoading(true);
    setPatcErrors([]);
    setPatcSuccess('');

    try {
      const data = await createPatcAccount({
        first_name: patcForm.first_name,
        last_name: patcForm.last_name,
        email: patcForm.email,
        password: patcForm.password,
      });

      if (data.success) {
        setPatcSuccess('PATC account created successfully!');
        setPatcForm({ first_name: '', last_name: '', email: '', password: '' });
      } else {
        setPatcErrors(data.errors?.map(e => e.message) || [data.message || 'Failed to create PATC account.']);
      }
    } catch (err) {
      setPatcErrors(['Connection error.']);
      console.error(err);
    } finally {
      setPatcLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Barangays</h1>
          <p className="text-gray-500">Overview of all barangay health centers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
          >
            + Create Barangay Admin
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
            + Add Barangay
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setShowPatcModal(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
            >
              + Create PATC Account
            </button>
          )}
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
            Allocate Stock
          </button>
        </div>
      </div>

      {/* Barangay Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {barangays.map((b) => (
          <div
            key={b.barangay_id}
            onClick={() => navigate(`/dashboard/barangays/${b.barangay_id}`)}
            className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
          >
            {getStockRequestCount(b.barangay_id) > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow z-10">
                {getStockRequestCount(b.barangay_id)}
              </span>
            )}
            <div className="border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">{b.name}</h3>
              <p className="text-xs text-gray-400">{b.municipality}, {b.province}</p>
            </div>
            <div className="space-y-3">
              {[
                { label: "Total Patients", val: b.stats?.total_patients ?? 0 },
                { label: "Compliance", val: `${b.stats?.compliance_percentage ?? 0}%` },
                { label: "At Risk", val: b.stats?.at_risk_count ?? 0 },
                { label: "Defaulters", val: b.stats?.defaulter_count ?? 0 },
              ].map((item, j) => (
                <div key={j} className="flex justify-between text-sm">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="font-bold text-gray-800">{item.val}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-500 text-sm">Stock</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${stockBadge(b.stats?.stock_status)}`}>
                  {b.stats?.stock_status ?? 'OK'}
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
              <h2 className="text-xl font-bold text-gray-800">Create Barangay Admin</h2>
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
                <label className="text-xs text-zinc-600">Barangay</label>
                <select
                  name="barangay_id"
                  value={form.barangay_id}
                  onChange={(e) => {
                    const selected = barangays.find(b => b.barangay_id === e.target.value);
                    setForm({
                      ...form,
                      barangay_id: selected?.barangay_id || '',
                      barangay_name: `Barangay ${selected?.name}` || '',
                      health_center_id: selected?.health_center?.health_center_id || '',
                    });
                  }}
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select Barangay</option>
                  {barangays.map((b) => (
                    <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>
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

      {/* Add Barangay Modal */}
      {showBarangayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Add Barangay</h2>
              <button
                onClick={() => { setShowBarangayModal(false); setBarangayErrors([]); setBarangaySuccess(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
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

            <form onSubmit={handleCreateBarangay} className="space-y-4">
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
                <p className="mt-1 text-xs text-gray-400">Barangay ID is generated automatically.</p>
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

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-zinc-500 mb-2">Health Center</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-600">Health Center ID</label>
                    <input
                      name="health_center_id"
                      value={barangayForm.health_center_id}
                      onChange={handleBarangayChange}
                      required
                      placeholder="HC-001"
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowBarangayModal(false); setBarangayErrors([]); setBarangaySuccess(''); }}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={barangayLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition disabled:bg-purple-400"
                >
                  {barangayLoading ? 'Creating...' : 'Add Barangay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create PATC Account Modal */}
      {showPatcModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Create PATC Account</h2>
              <button
                onClick={() => { setShowPatcModal(false); setPatcErrors([]); setPatcSuccess(''); }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {patcErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm space-y-1">
                {patcErrors.map((e, i) => <p key={i}>• {e}</p>)}
              </div>
            )}
            {patcSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
                {patcSuccess}
              </div>
            )}

            <form onSubmit={handleCreatePatc} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-600">First Name</label>
                  <input
                    name="first_name"
                    value={patcForm.first_name}
                    onChange={handlePatcChange}
                    required
                    placeholder="Juan"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-600">Last Name</label>
                  <input
                    name="last_name"
                    value={patcForm.last_name}
                    onChange={handlePatcChange}
                    required
                    placeholder="Dela Cruz"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-600">Email</label>
                <input
                  name="email"
                  type="email"
                  value={patcForm.email}
                  onChange={handlePatcChange}
                  required
                  placeholder="patc@tbmonitoring.gov.ph"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-600">Password</label>
                <input
                  name="password"
                  type="password"
                  value={patcForm.password}
                  onChange={handlePatcChange}
                  required
                  placeholder="Min. 8 chars, 1 uppercase, 1 lowercase, 1 number"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPatcModal(false); setPatcErrors([]); setPatcSuccess(''); }}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={patcLoading}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:bg-amber-400"
                >
                  {patcLoading ? 'Creating...' : 'Create Account'}
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