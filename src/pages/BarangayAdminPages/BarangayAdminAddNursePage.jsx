import { useState, useEffect, useCallback } from "react";
import { createNurse, fetchNurses, deactivateNurse, reactivateNurse, updateNurse, deleteNurse } from "../../services/barangay.service.js";

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone_number: '',
};

const NurseManagementPanel = () => {
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nurses, setNurses]             = useState([]);
  const [nursesLoading, setNursesLoading] = useState(true);
  const [page, setPage]                 = useState(1);
  const [total, setTotal]               = useState(0);
  const [sortField, setSortField]       = useState('created_at');
  const [sortDir, setSortDir]           = useState('desc');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const limit = 10;

  const [editingNurse, setEditingNurse]   = useState(null);
  const [editForm, setEditForm]           = useState({ first_name: '', last_name: '', email: '', phone_number: '' });
  const [editLoading, setEditLoading]     = useState(false);
  const [editError, setEditError]         = useState('');

  const [deletingNurse, setDeletingNurse] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]     = useState('');

  const inputClass = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const labelClass = "text-xs text-zinc-600 font-medium";

  const admin        = JSON.parse(localStorage.getItem('admin') || '{}');
  const barangayName = admin.barangay_name;
  const barangay_id  = admin.barangay_id;

  const loadNurses = useCallback(async (currentPage = 1) => {
    setNursesLoading(true);
    try {
      const data = await fetchNurses({ barangay_id, page: currentPage, limit });
      if (data.success) {
        setNurses(data.data?.users || []);
        setTotal(data.data?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load nurses:', err);
    } finally {
      setNursesLoading(false);
    }
  }, [barangay_id]);

  useEffect(() => {
    loadNurses(page);
  }, [page, loadNurses]);

  const handleChange = (field, value) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        role: 'nurse',
      };

      if (form.phone_number) {
        payload.phone_number = form.phone_number.startsWith('09')
          ? '+63' + form.phone_number.slice(1)
          : form.phone_number;
      }

      const data = await createNurse(payload);

      if (data.success) {
        setSuccess(`Nurse account created for ${data.data?.first_name} ${data.data?.last_name}.`);
        setForm(EMPTY_FORM);
        loadNurses(1);
        setPage(1);
      } else {
        setError(data.message || 'Failed to create nurse account.');
      }
    } catch (err) {
      console.error('error:', err);
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (nurse) => {
    try {
      const data = nurse.is_active
        ? await deactivateNurse(nurse.user_id)
        : await reactivateNurse(nurse.user_id);
      if (data.success) loadNurses(page);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const openEditNurse = (nurse) => {
    setEditingNurse(nurse);
    setEditForm({
      first_name: nurse.first_name || '',
      last_name: nurse.last_name || '',
      email: nurse.email || '',
      phone_number: nurse.phone_number || '',
    });
    setEditError('');
  };

  const handleEditSubmit = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      const data = await updateNurse(editingNurse.user_id, editForm);
      if (data.success) {
        setEditingNurse(null);
        loadNurses(page);
      } else {
        setEditError(data.message || 'Failed to update nurse account.');
      }
    } catch (err) {
      setEditError('Connection error.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const data = await deleteNurse(deletingNurse.user_id);
      if (data.success) {
        setDeletingNurse(null);
        loadNurses(page);
      } else {
        setDeleteError(data.message || 'Failed to delete nurse account.');
      }
    } catch (err) {
      setDeleteError('Connection error.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Client-side date range filter + sort
  const filtered = nurses.filter((n) => {
    if (!n.created_at) return !dateFrom && !dateTo;
    const createdDate = n.created_at.slice(0, 10);
    if (dateFrom && createdDate < dateFrom) return false;
    if (dateTo && createdDate > dateTo) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField] ?? '';
    let valB = b[sortField] ?? '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleCreatedSort = () => {
    setSortField('created_at');
    setSortDir(d => (sortField === 'created_at' && d === 'desc') ? 'asc' : 'desc');
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Nurse Management</h1>
        <p className="text-gray-500">Create and manage nurse accounts for your barangay</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {error   && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{success}</div>}

        <div className="space-y-6">
          {/* Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">Nurse Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name *</label>
                <input className={inputClass} value={form.first_name} onChange={e => handleChange('first_name', e.target.value)} placeholder="Juan" />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input className={inputClass} value={form.last_name} onChange={e => handleChange('last_name', e.target.value)} placeholder="Dela Cruz" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Email *</label>
                <input type="email" className={inputClass} value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="nurse@barangay.gov.ph" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} value={form.phone_number} onChange={e => handleChange('phone_number', e.target.value)} placeholder="09XXXXXXXXX or +639XXXXXXXXX" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={inputClass}
                    value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Min. 8 characters, 1 uppercase, 1 number"
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs mt-0.5">
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Must be at least 8 characters with 1 uppercase letter and 1 number.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 pb-1 border-b">Assignment</h3>
            <div>
              <label className={labelClass}>Barangay</label>
              <input className={`${inputClass} bg-gray-50 text-gray-500 cursor-not-allowed`} value={barangayName || '—'} disabled readOnly />
              <p className="text-xs text-gray-400 mt-1">Automatically assigned to your barangay.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setForm(EMPTY_FORM); setError(''); setSuccess(''); }} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">
              Reset
            </button>
            <button type="button" onClick={handleSubmit} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-blue-400">
              {loading ? 'Creating...' : 'Create Nurse Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Nurses Table */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Nurses in Your Barangay</h2>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <label className="flex items-center gap-2 text-xs text-gray-500">
            From
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
            to
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none bg-white [color-scheme:light]" />
          </label>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
              ✕ Clear Dates
            </button>
          )}
          <button
            onClick={toggleCreatedSort}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition text-gray-600"
          >
            {sortField === 'created_at' && sortDir === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="p-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('last_name')}>
                  Name <SortIcon field="last_name" />
                </th>
                <th className="p-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('email')}>
                  Email <SortIcon field="email" />
                </th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('is_active')}>
                  Status <SortIcon field="is_active" />
                </th>
                <th className="p-3 text-left cursor-pointer hover:text-gray-700" onClick={() => handleSort('created_at')}>
                  Created <SortIcon field="created_at" />
                </th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {nursesLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">Loading nurses...</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">No nurses found.</td></tr>
              ) : sorted.map((nurse, i) => (
                <tr key={i} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-3 font-semibold text-gray-800">{nurse.first_name} {nurse.last_name}</td>
                  <td className="p-3 text-gray-600">{nurse.email}</td>
                  <td className="p-3 text-gray-600">{nurse.phone_number || '—'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${nurse.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {nurse.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                    {nurse.created_at ? new Date(nurse.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditNurse(nurse)}
                        className="text-xs px-3 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setDeletingNurse(nurse); setDeleteError(''); }}
                        className="text-xs px-3 py-1 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleToggleStatus(nurse)}
                        className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
                          nurse.is_active
                            ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {nurse.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-gray-600">
              <span>Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} nurses</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border ${page === p ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Nurse Modal */}
      {editingNurse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Edit Nurse</h2>
              <button onClick={() => setEditingNurse(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{editError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name *</label>
                  <input className={inputClass} value={editForm.first_name} onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className={labelClass}>Last Name *</label>
                  <input className={inputClass} value={editForm.last_name} onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" className={inputClass} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} value={editForm.phone_number} onChange={e => setEditForm(p => ({ ...p, phone_number: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingNurse(null)} className="px-6 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleEditSubmit} disabled={editLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-blue-400">
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Nurse Confirmation */}
      {deletingNurse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete nurse account?</h2>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete {deletingNurse.first_name} {deletingNurse.last_name}'s account. This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm text-left">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingNurse(null)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:bg-red-300"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseManagementPanel;