import { useState, useEffect, useCallback } from "react";
import { fetchAllAppointments } from "../../services/appointment.service.js";
import { fetchBarangays } from "../../services/barangay.service.js";

const statusBadge = (status) => {
  if (status === "Confirmed") return "bg-blue-100 text-blue-700";
  if (status === "Completed") return "bg-green-100 text-green-700";
  if (status === "Cancelled") return "bg-red-100 text-red-600";
  return "bg-yellow-100 text-yellow-700"; // Pending
};

const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

const formatTime = (time) => {
  if (!time) return "—";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const AppointmentsPanel = () => {
  const [appointments, setAppointments] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [barangayFilter, setBarangayFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const limit = 20;

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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAllAppointments({
        status: statusFilter,
        purpose: purposeFilter,
        barangay_id: barangayFilter,
        page,
        limit,
      });
      if (data.success) {
        setAppointments(data.data?.appointments || []);
        setTotal(data.data?.total || 0);
      } else {
        setError(data.message || "Failed to load appointments.");
      }
    } catch {
      setError("Connection error.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, purposeFilter, barangayFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = statusFilter || purposeFilter || barangayFilter;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Appointments</h1>
        <p className="text-gray-500">Municipal-wide view of patient appointment schedules</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-center flex-wrap">
        <select value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900">
          <option value="">All Barangays</option>
          {barangays.map((b) => <option key={b.barangay_id} value={b.barangay_id}>{b.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900">
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select value={purposeFilter} onChange={(e) => { setPurposeFilter(e.target.value); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-zinc-900">
          <option value="">All Purposes</option>
          <option value="Follow-up">Follow-up</option>
          <option value="Sputum Test">Sputum Test</option>
          <option value="Medication Refill">Medication Refill</option>
          <option value="Consultation">Consultation</option>
          <option value="Routine">Routine</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setStatusFilter(""); setPurposeFilter(""); setBarangayFilter(""); setPage(1); }}
            className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition"
          >
            ✕ Clear
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{total} appointment{total !== 1 ? "s" : ""}</span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              {["Patient", "Barangay", "Purpose", "Date", "Time", "Status", "Actions"].map((h, i) => (
                <th key={h} className={`p-4 whitespace-nowrap ${i >= 5 ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400">Loading...</td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400">No appointments found.</td></tr>
            ) : appointments.map((a) => (
              <tr key={a.appointment_id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <p className="font-semibold text-gray-800">{a.patient_name || a.patient_id}</p>
                  <p className="text-xs text-gray-400">{a.patient_phone || ""}</p>
                </td>
                <td className="p-4 text-gray-600">{a.patient_barangay_name || "—"}</td>
                <td className="p-4 text-gray-600">{a.purpose}</td>
                <td className="p-4 text-gray-600 whitespace-nowrap">{formatDate(a.scheduled_date)}</td>
                <td className="p-4 text-gray-600 whitespace-nowrap">{formatTime(a.scheduled_time)}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(a.status)}`}>{a.status}</span>
                </td>
                <td className="p-4 text-center whitespace-nowrap">
                  <button
                    onClick={() => setSelectedAppointment(a)}
                    className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
            <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} appointments</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border ${page === p ? "bg-blue-600 text-white border-blue-600" : "hover:bg-gray-50"}`}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* View Appointment Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Appointment Details</h2>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedAppointment.appointment_id}</p>
              </div>
              <button onClick={() => setSelectedAppointment(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-3">Patient</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Name</p><p className="text-gray-800">{selectedAppointment.patient_name || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Patient ID</p><p className="text-gray-800 font-mono">{selectedAppointment.patient_id}</p></div>
                <div><p className="text-xs text-gray-400">Phone</p><p className="text-gray-800">{selectedAppointment.patient_phone || "—"}</p></div>
                <div><p className="text-xs text-gray-400">Barangay</p><p className="text-gray-800">{selectedAppointment.patient_barangay_name || "—"}</p></div>
                <div><p className="text-xs text-gray-400">TB Case No.</p><p className="text-gray-800 font-mono">{selectedAppointment.tb_case_number || "—"}</p></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-3">Schedule</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Purpose</p><p className="text-gray-800">{selectedAppointment.purpose}</p></div>
                <div><p className="text-xs text-gray-400">Status</p><span className={`inline-block text-xs px-2 py-1 rounded-full font-semibold ${statusBadge(selectedAppointment.status)}`}>{selectedAppointment.status}</span></div>
                <div><p className="text-xs text-gray-400">Date</p><p className="text-gray-800">{formatDate(selectedAppointment.scheduled_date)}</p></div>
                <div><p className="text-xs text-gray-400">Time</p><p className="text-gray-800">{formatTime(selectedAppointment.scheduled_time)}</p></div>
                {selectedAppointment.physician && (
                  <div className="col-span-2"><p className="text-xs text-gray-400">Physician</p><p className="text-gray-800">{selectedAppointment.physician}</p></div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-3">History</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-gray-400">Requested</p><p className="text-gray-800">{formatDate(selectedAppointment.requested_at)}</p></div>
                {selectedAppointment.confirmed_at && (
                  <div><p className="text-xs text-gray-400">Confirmed</p><p className="text-gray-800">{formatDate(selectedAppointment.confirmed_at)}</p></div>
                )}
                {selectedAppointment.completed_at && (
                  <div><p className="text-xs text-gray-400">Completed</p><p className="text-gray-800">{formatDate(selectedAppointment.completed_at)}</p></div>
                )}
                {selectedAppointment.cancelled_at && (
                  <div><p className="text-xs text-gray-400">Cancelled</p><p className="text-gray-800">{formatDate(selectedAppointment.cancelled_at)}</p></div>
                )}
                {selectedAppointment.cancellation_reason && (
                  <div className="col-span-2"><p className="text-xs text-gray-400">Cancellation Reason</p><p className="text-gray-800">{selectedAppointment.cancellation_reason}</p></div>
                )}
              </div>
            </div>

            {selectedAppointment.notes && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-blue-700 mb-2">Notes</p>
                <p className="text-sm text-gray-600">{selectedAppointment.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedAppointment(null)} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPanel;
