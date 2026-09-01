import { useState } from 'react';
import { restockInventoryItem } from '../services/inventory.service';

export default function AddMedicineModal({ existingItems = [], onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantityAdded, setQuantityAdded] = useState('');
  const [notes, setNotes] = useState('');

  const handleRestock = async () => {
    if (!selectedInventoryId) return setError('Select a medicine to restock.');
    if (!quantityAdded || Number(quantityAdded) < 1) return setError('Enter a valid quantity.');

    setSubmitting(true);
    setError('');
    try {
      const res = await restockInventoryItem(selectedInventoryId, {
        quantity_added: Number(quantityAdded),
        notes,
      });
      if (!res.success) throw new Error(res.message || 'Failed to restock.');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 w-[420px] max-w-[90vw] max-h-[85vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Restock Medicine</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{error}</div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600 mt-2">Medicine</label>
          <select
            value={selectedInventoryId}
            onChange={(e) => setSelectedInventoryId(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm outline-none"
          >
            <option value="">Select a medicine...</option>
            {existingItems.map((item) => (
              <option key={item.inventory_id} value={item.inventory_id}>
                {item.drug_name} {item.strength} — {item.remaining_stock} {item.unit}(s) remaining
              </option>
            ))}
          </select>

          <label className="text-xs font-semibold text-gray-600 mt-2">Quantity to Add</label>
          <input
            type="number"
            min="1"
            value={quantityAdded}
            onChange={(e) => setQuantityAdded(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm outline-none"
            placeholder="e.g. 500"
          />

          <label className="text-xs font-semibold text-gray-600 mt-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border px-3 py-2 rounded-lg text-sm outline-none min-h-[60px]"
            placeholder="e.g. Delivery from municipal warehouse"
          />

          <button
            onClick={handleRestock}
            disabled={submitting}
            className="mt-4 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Add Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}