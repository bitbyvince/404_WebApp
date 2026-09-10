import { authFetch } from './auth.service';

const BASE_URL = import.meta.env.VITE_API_URL;

// ✅ Add this — used by InventoryPanel
export const fetchInventory = async ({ barangay_id, stock_status, drug_name, page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams();
  if (barangay_id) params.set('barangay_id', barangay_id);
  if (stock_status) params.set('stock_status', stock_status);
  if (drug_name) params.set('drug_name', drug_name);
  params.set('page', page);
  params.set('limit', limit);

  const res = await authFetch(`${BASE_URL}/api/inventory?${params}`);
  return res.json();
};

// existing — used by BarangayDetailPage
export const fetchInventoryByBarangay = async (barangay_id) => {
  const params = new URLSearchParams({ barangay_id });
  const res = await authFetch(`${BASE_URL}/api/inventory?${params}`);
  return res.json();
};

// ✅ Restock an existing inventory item
export const restockInventoryItem = async (inventoryId, { quantity_added, notes }) => {
  const res = await authFetch(`${BASE_URL}/api/inventory/${inventoryId}/restock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity_added, notes }),
  });
  return res.json();
};

// Create a brand-new inventory line for a drug/strength this health
// center hasn't stocked before.
export const createInventoryItem = async (payload) => {
  const res = await authFetch(`${BASE_URL}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};
