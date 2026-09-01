import { useState, useEffect, useCallback } from "react";
import { fetchInventory } from "../../services/inventory.service.js";
import AddMedicineModal from "../AddMedicineModal.jsx";

const stockBadge = (status) => {
  if (status === "OK")       return "bg-green-100 text-green-700";
  if (status === "LOW")      return "bg-yellow-100 text-yellow-700";
  if (status === "CRITICAL") return "bg-orange-100 text-orange-700";
  if (status === "STOCKOUT") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const MedicineInventoryPanel = () => {
  const [inventory, setInventory]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [drugFilter, setDrugFilter]   = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const limit = 20;

  const admin       = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangay_id = admin.barangay_id;

  const load = useCallback(async (stock = '', drug = '', currentPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchInventory({
        barangay_id,
        stock_status: stock,
        drug_name: drug,
        page: currentPage,
        limit,
      });
      if (data.success) {
        const raw = data.data?.data ?? data.data?.inventory ?? data.data ?? [];
        setInventory(Array.isArray(raw) ? raw : []);
        setTotal(data.data?.total ?? data.total ?? 0);
      } else {
        setError(data.message || 'Failed to load inventory.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }, [barangay_id]);

  useEffect(() => {
    load(stockFilter, drugFilter, page);
  }, [stockFilter, drugFilter, page, load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in fade-in duration-500">

      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Medicine Inventory</h1>
          <p className="text-gray-500">Barangay-level stock monitoring</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
          >
            + Add Medicine
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
            ⬇ Export Stock Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex gap-3 flex-wrap items-center">
        <select
          value={stockFilter}
          onChange={(e) => { setStockFilter(e.target.value); setPage(1); }}
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OK">OK</option>
          <option value="LOW">Low</option>
          <option value="CRITICAL">Critical</option>
          <option value="STOCKOUT">Stockout</option>
        </select>

        <input
          type="text"
          placeholder="Search drug name..."
          value={drugFilter}
          onChange={(e) => { setDrugFilter(e.target.value); setPage(1); }}
          className="border px-3 py-2 rounded-lg text-xs outline-none flex-1 min-w-[180px]"
        />

        {(stockFilter || drugFilter) && (
          <button
            onClick={() => { setStockFilter(''); setDrugFilter(''); setPage(1); }}
            className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Drug", "Strength", "Unit", "Total Allocated", "Total Dispensed", "Remaining Stock", "Active Patients", "Last Updated", "Status"].map(h => (
                <th key={h} className="p-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">Loading...</td></tr>
            ) : inventory.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">No inventory records found.</td></tr>
            ) : (
              inventory.map((item, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium text-gray-700">{item.drug_name ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.strength ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.unit ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.total_allocated?.toLocaleString() ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.total_dispensed?.toLocaleString() ?? '—'}</td>
                  <td className="p-3 font-bold text-gray-800">{item.remaining_stock?.toLocaleString() ?? '—'}</td>
                  <td className="p-3 text-gray-600">{item.active_patients_on_this_drug ?? '—'}</td>
                  <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(item.last_updated_at ?? item.updated_at)}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${stockBadge(item.stock_status)}`}>
                      {item.stock_status ?? '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} records</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border text-sm ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMedicineModal
          barangayId={barangay_id}
          healthCenterId={admin.health_center_id}
          existingItems={inventory}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            load(stockFilter, drugFilter, page);
          }}
        />
      )}
    </div>
  );
};

export default MedicineInventoryPanel;