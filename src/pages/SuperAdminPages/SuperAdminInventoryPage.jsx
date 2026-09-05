import { useState, useEffect, useMemo } from "react";
import { fetchInventory } from "../../services/inventory.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";
import { exportInventoryReportPdf } from "../../services/report.service.js";

const stockBadge = (status) => {
  if (status === "OK") return "bg-green-100 text-green-700";
  if (status === "Low") return "bg-yellow-100 text-yellow-700";
  if (status === "Critical") return "bg-orange-100 text-orange-700";
  if (status === "Stockout") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
};

const InventoryPanel = () => {
  const [inventory, setInventory] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    barangay_id: "",
    stock_status: "",
    drug_name: "",
  });

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Fetch barangays
  useEffect(() => {
    const loadBarangays = async () => {
      try {
        const data = await fetchBarangays();
        if (data.success) setBarangays(data.barangays || []);
      } catch (err) {
        console.error("Failed to fetch barangays:", err);
      }
    };
    loadBarangays();
  }, []);

  // Barangay lookup map (IMPORTANT FIX)
  const barangayMap = useMemo(() => {
    return Object.fromEntries(
      barangays.map((b) => [b.barangay_id, b.name])
    );
  }, [barangays]);

  // Fetch inventory
  useEffect(() => {
    const loadInventory = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await fetchInventory({ ...filters, page, limit });

        if (data.success) {
          setInventory(data.data?.data || []);
          setTotal(data.data?.total || 0);
        } else {
          setError(data.message || "Failed to load inventory.");
        }
      } catch (err) {
        setError("Connection error.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, [filters, page]);

  const handleFilterChange = (key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const blob = await exportInventoryReportPdf({ barangay_id: filters.barangay_id || undefined });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export inventory PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPdf(false);
    }
  };

  const clearFilters = () => {
    setFilters({ barangay_id: "", stock_status: "", drug_name: "" });
    setPage(1);
  };

  const hasActiveFilters =
    filters.barangay_id || filters.stock_status || filters.drug_name;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Medicine Inventory
          </h2>
          <p className="text-sm text-gray-500">
            Barangay-level stock monitoring
          </p>
        </div>

        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:bg-blue-300"
        >
          {exportingPdf ? 'Exporting...' : '⬇ Export Stock Report'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 flex gap-3 flex-wrap">
        <select
          value={filters.barangay_id}
          onChange={(e) =>
            handleFilterChange("barangay_id", e.target.value)
          }
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Barangays</option>
          {barangays.map((b) => (
            <option key={b.barangay_id} value={b.barangay_id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={filters.stock_status}
          onChange={(e) =>
            handleFilterChange("stock_status", e.target.value)
          }
          className="border px-3 py-2 rounded-lg text-xs bg-white outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OK">OK</option>
          <option value="Low">Low</option>
          <option value="Critical">Critical</option>
          <option value="Stockout">Stockout</option>
        </select>

        <input
          type="text"
          placeholder="Search drug name..."
          value={filters.drug_name}
          onChange={(e) =>
            handleFilterChange("drug_name", e.target.value)
          }
          className="border px-3 py-2 rounded-lg text-xs outline-none"
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            ✕ Clear Filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              {[
                "Barangay",
                "Drug",
                "Strength",
                "Unit",
                "Total Allocated",
                "Total Dispensed",
                "Remaining Stock",
                "Active Patients",
                "Status",
              ].map((h) => (
                <th key={h} className="p-3 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : inventory.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-400">
                  No inventory records found.
                </td>
              </tr>
            ) : (
              inventory.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-medium text-gray-700">
                    {barangayMap[item.barangay_id] ||
                      item.barangay_id ||
                      "Unknown"}
                  </td>

                  <td className="p-3 text-gray-700">
                    {item.drug_name}
                  </td>
                  <td className="p-3 text-gray-600">{item.strength}</td>
                  <td className="p-3 text-gray-600">{item.unit}</td>
                  <td className="p-3 text-gray-600">
                    {item.total_allocated?.toLocaleString() ?? "—"}
                  </td>
                  <td className="p-3 text-gray-600">
                    {item.total_dispensed?.toLocaleString() ?? "—"}
                  </td>
                  <td className="p-3 font-bold text-gray-800">
                    {item.remaining_stock?.toLocaleString() ?? "—"}
                  </td>
                  <td className="p-3 text-gray-600">
                    {item.active_patients_on_this_drug ?? "—"}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${stockBadge(
                        item.stock_status
                      )}`}
                    >
                      {item.stock_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>
              Showing {(page - 1) * limit + 1}–
              {Math.min(page * limit, total)} of {total} records
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded border text-sm ${
                      page === p
                        ? "bg-blue-600 text-white border-blue-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setPage((p) => Math.min(p + 1, totalPages))
                }
                disabled={page === totalPages}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPanel;