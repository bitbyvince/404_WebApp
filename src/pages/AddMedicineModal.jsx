import { useState } from 'react';
import { restockInventoryItem, createInventoryItem } from '../services/inventory.service';

// Strength is free text ("500", "500mg", "500 mg") depending on where it
// was entered, so compare on the numeric value only rather than the raw
// string — otherwise an exact-match lookup silently fails to find stock
// that's actually there.
const normalizeStrength = (s) => String(s ?? '').replace(/[^0-9.]/g, '');

// HRZE/HR are fixed-dose combinations with no meaningful "strength" of
// their own (new patient records carry an empty strength for them), but
// existing inventory rows created before that may still have one on file
// (e.g. "500mg") — match those by drug name alone rather than requiring
// the strengths to line up.
const isFixedCombo = (drugName) => ['HRZE', 'HR'].includes(drugName);

export default function AddMedicineModal({ barangayId, healthCenterId, existingItems = [], recommendedItems = [], onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // existingItems may come from a barangay-wide fetch that spans more
  // than one health center — health_center_id must match too, or a
  // barangay with 2 facilities could restock the wrong one's stock.
  const findMatch = (item) =>
    existingItems.find((i) =>
      i.health_center_id === healthCenterId &&
      i.drug_name === item.drug_name &&
      (isFixedCombo(item.drug_name) || normalizeStrength(i.strength) === normalizeStrength(item.strength))
    );

  // Auto-fill from the patient's weight-based recommendation, if any —
  // the admin never has to look it up or type it in manually.
  const initialRecommended = recommendedItems[0];
  const initialMatch = initialRecommended ? findMatch(initialRecommended) : null;

  const [selectedInventoryId, setSelectedInventoryId] = useState(initialMatch?.inventory_id || '');
  const [quantityAdded, setQuantityAdded] = useState(initialRecommended ? String(initialRecommended.quantity_needed) : '');
  const [notes, setNotes] = useState('');

  // The recommended item currently being resolved via "Add New Medicine"
  // because it has no matching inventory row yet.
  const [newItem, setNewItem] = useState(initialRecommended && !initialMatch ? initialRecommended : null);
  const [expiryDate, setExpiryDate] = useState('');
  const [creatingItem, setCreatingItem] = useState(false);

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

  const handleCreateNewItem = async () => {
    if (!expiryDate) return setError('Enter an expiry date for this new stock.');

    setCreatingItem(true);
    setError('');
    try {
      const res = await createInventoryItem({
        barangay_id: barangayId,
        health_center_id: healthCenterId,
        drug_name: newItem.drug_name,
        strength: newItem.strength,
        unit: newItem.unit,
        initial_quantity: newItem.quantity_needed,
        expiry_date: expiryDate,
      });
      if (!res.success) throw new Error(res.message || 'Failed to add medicine to inventory.');
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setCreatingItem(false);
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

        {newItem ? (
          <div className="flex flex-col gap-1">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs mb-2">
              {newItem.drug_name} {newItem.strength} isn't in this health center's inventory yet — add it as a new stock line below.
            </div>

            <label className="text-xs font-semibold text-gray-600 mt-1">Medicine</label>
            <p className="text-sm text-gray-800 px-1">{newItem.drug_name} {newItem.strength} ({newItem.unit})</p>

            <label className="text-xs font-semibold text-gray-600 mt-2">Initial Quantity</label>
            <p className="text-sm text-gray-800 px-1">{newItem.quantity_needed} {newItem.unit}(s)</p>

            <label className="text-xs font-semibold text-gray-600 mt-2">Expiry Date *</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm outline-none"
            />

            <button
              onClick={handleCreateNewItem}
              disabled={creatingItem}
              className="mt-4 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {creatingItem ? 'Saving...' : '+ Add to Inventory'}
            </button>
            <button
              onClick={() => { setNewItem(null); setExpiryDate(''); setError(''); }}
              className="mt-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel — pick an existing medicine instead
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 mt-2">Medicine</label>
            <select
              value={selectedInventoryId}
              onChange={(e) => setSelectedInventoryId(e.target.value)}
              className="border px-3 py-2 rounded-lg text-sm outline-none"
            >
              <option value="">Select a medicine...</option>
              {existingItems
                .filter((item) => item.health_center_id === healthCenterId)
                .map((item) => (
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
        )}
      </div>
    </div>
  );
}
