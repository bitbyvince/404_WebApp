import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  fetchActivePatientsForDispensing,
  createDispensingRecord,
  fetchDispensingRecords,
} from "../../services/dispensing.service";
import { fetchInventory } from "../../services/inventory.service";
import "./MedicineDispensing.css";

const DEFAULT_DAYS_SUPPLY = 7;
const LOGS_LIMIT = 10;

const statusStyles = {
  Normal: { bg: "#E5F7ED", text: "#1E9E5A" },
  Low: { bg: "#FEF6E0", text: "#C99A1D" },
  Critical: { bg: "#FDEAEA", text: "#D4453D" },
  New: { bg: "#EEF2FE", text: "#2F5CE0" },
};

function StatusPill({ status }) {
  const s = statusStyles[status] || statusStyles.Normal;
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.text,
        fontSize: "12px",
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: "999px",
        display: "inline-block",
      }}
    >
      {status}
    </span>
  );
}

function SortArrow({ column, sortConfig }) {
  if (sortConfig.key !== column) return null;
  return <span style={{ marginLeft: "4px" }}>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function drugKey(drugName, strength) {
  return `${drugName}|${strength}`;
}

export default function MedicineDispensing() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [daysSupply, setDaysSupply] = useState(DEFAULT_DAYS_SUPPLY);
  const [notes, setNotes] = useState("");
  const [confirmedLog, setConfirmedLog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "next_pickup_due", direction: "asc" });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [drugQuantities, setDrugQuantities] = useState({});

  // Dispensing Logs table state
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);

  const admin = JSON.parse(localStorage.getItem("admin") || "{}");
  const isSuperAdmin = admin.role === "super_admin";
  const barangayId = localStorage.getItem("barangay_id"); // null for super_admin

  const loadPatients = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchActivePatientsForDispensing(barangayId);
      if (data.success) {
        setPatients(data.patients || []);
      } else {
        setLoadError(data.message || "Failed to load patients.");
      }
    } catch (err) {
      setLoadError("Connection error loading patients.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryForBarangay = async (targetBarangayId) => {
    if (!targetBarangayId) {
      setInventoryItems([]);
      return;
    }
    try {
      const res = await fetchInventory({ barangay_id: targetBarangayId, limit: 100 });
      if (res.success) {
        setInventoryItems(res.data?.data || []);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    }
  };

  const loadLogs = async (targetPage = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetchDispensingRecords({
        barangay_id: isSuperAdmin ? undefined : barangayId,
        page: targetPage,
        limit: LOGS_LIMIT,
      });
      if (res.success) {
        setLogs(res.records || []);
        setLogsTotal(res.total || 0);
        setLogsPage(res.page || targetPage);
      }
    } catch (err) {
      console.error("Failed to load dispensing logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    if (!isSuperAdmin) {
      loadInventoryForBarangay(barangayId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLogs(logsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logsPage]);

  const selectedPatient = patients.find((p) => p.patient_id === selectedPatientId);

  useEffect(() => {
    if (isSuperAdmin && selectedPatient) {
      loadInventoryForBarangay(selectedPatient.barangay_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  useEffect(() => {
    if (!selectedPatient) {
      setDrugQuantities({});
      return;
    }
    const regimen = selectedPatient.drug_regimen || [];
    const initial = {};
    inventoryItems.forEach((item) => {
      const key = drugKey(item.drug_name, item.strength);
      const regimenEntry = regimen.find(
        (r) => r.drug_name === item.drug_name && r.strength === item.strength
      );
      initial[key] = regimenEntry ? regimenEntry.number_to_be_taken * daysSupply : 0;
    });
    setDrugQuantities(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId, inventoryItems]);

  useEffect(() => {
    if (!selectedPatient) return;
    const regimen = selectedPatient.drug_regimen || [];
    setDrugQuantities((prev) => {
      const updated = { ...prev };
      regimen.forEach((entry) => {
        const key = drugKey(entry.drug_name, entry.strength);
        updated[key] = entry.number_to_be_taken * daysSupply;
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysSupply]);

  const getPatientDisplayName = (patientId) => {
    const match = patients.find((p) => p.patient_id === patientId);
    return match ? match.full_name : null;
  };

  // ✅ New — resolves a barangay_id to its name using whichever active patients
  // are currently loaded (they already carry both barangay_id and barangay_name).
  const barangayNameById = patients.reduce((acc, p) => {
    if (p.barangay_id && p.barangay_name) acc[p.barangay_id] = p.barangay_name;
    return acc;
  }, {});

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const sortValue = (patient, key) => {
    switch (key) {
      case "full_name":
        return (patient.full_name || "").toLowerCase();
      case "barangay_name":
        return (patient.barangay_name || patient.barangay_id || "").toLowerCase();
      case "next_pickup_due":
        return patient.next_pickup_due ? new Date(patient.next_pickup_due).getTime() : Infinity;
      case "remaining_days":
        return patient.remaining_days === null ? Infinity : patient.remaining_days;
      case "status":
        return patient.status || "";
      default:
        return "";
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.full_name.toLowerCase().includes(q) ||
      (p.barangay_name || "").toLowerCase().includes(q) ||
      (p.tb_case_number || "").toLowerCase().includes(q)
    );
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const va = sortValue(a, sortConfig.key);
    const vb = sortValue(b, sortConfig.key);
    if (va < vb) return sortConfig.direction === "asc" ? -1 : 1;
    if (va > vb) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const filteredLogs = logs.filter((record) => {
    if (!logsSearch) return true;
    const q = logsSearch.toLowerCase();
    const name = getPatientDisplayName(record.patient_id) || "";
    return (
      (record.tb_case_number || "").toLowerCase().includes(q) ||
      (record.patient_id || "").toLowerCase().includes(q) ||
      (record.drug_name || "").toLowerCase().includes(q) ||
      name.toLowerCase().includes(q)
    );
  });

  const handleQuantityChange = (key, value) => {
    const num = parseInt(value, 10);
    setDrugQuantities((prev) => ({ ...prev, [key]: Number.isNaN(num) ? 0 : num }));
  };

  const handleDispense = async () => {
    if (!selectedPatient) return;

    const medicines = inventoryItems
      .map((item) => {
        const key = drugKey(item.drug_name, item.strength);
        const qty = drugQuantities[key] || 0;
        return qty > 0
          ? { drug_name: item.drug_name, strength: item.strength, quantity_dispensed: qty }
          : null;
      })
      .filter(Boolean);

    if (medicines.length === 0) {
      alert("Enter a quantity for at least one medicine to dispense.");
      return;
    }

    setSubmitting(true);

    const dispensedBarangayId = selectedPatient.barangay_id || barangayId;

    try {
      const today = new Date();
      const dispenseDate = today.toISOString().slice(0, 10);

      const data = await createDispensingRecord({
        patient_id: selectedPatient.patient_id,
        days_supplied: daysSupply,
        dispense_date: dispenseDate,
        medicines,
        notes,
      });

      if (data.success) {
        const nextDue = new Date(today);
        nextDue.setDate(nextDue.getDate() + daysSupply);

        setConfirmedLog({
          name: selectedPatient.full_name,
          days: daysSupply,
          nextDue: formatDate(nextDue),
        });
        setTimeout(() => setConfirmedLog(null), 4000);

        setDaysSupply(DEFAULT_DAYS_SUPPLY);
        setNotes("");
        setSelectedPatientId(null);

        await loadPatients();
        await loadInventoryForBarangay(dispensedBarangayId);
        await loadLogs(1);
      } else {
        alert(data.message || "Failed to record dispensing.");
      }
    } catch (err) {
      alert("Connection error while recording dispensing.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const columnTemplate = isSuperAdmin ? "1.6fr 1fr 1fr 1fr 1fr" : "2fr 1fr 1fr 1fr";
  const logsColSpan = isSuperAdmin ? 7 : 6;

  return (
    <div
      style={{
        minHeight: "600px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundColor: "#F5F6FA",
      }}
    >
      <div className="medicine-dispensing-main" style={{ padding: "32px 40px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "28px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#12183A", margin: 0 }}>
              Medicine Dispensing
            </h1>
            <p style={{ color: "#6B7280", marginTop: "4px", fontSize: "14px" }}>
              {isSuperAdmin
                ? "Hand out a take-home medicine supply to any patient, municipal-wide"
                : "Hand out a take-home medicine supply to a patient"}
            </p>
          </div>
        </div>

        {confirmedLog && (
          <div
            style={{
              backgroundColor: "#E5F7ED",
              border: "1px solid #B7EAC9",
              color: "#1E9E5A",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ✓ Gave {confirmedLog.name} a {confirmedLog.days}-day supply to
            take home. Next pickup due {confirmedLog.nextDue}. Inventory
            updated.
          </div>
        )}

        {loadError && (
          <div
            style={{
              backgroundColor: "#FDEAEA",
              border: "1px solid #F5C2C2",
              color: "#D4453D",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "14px",
            }}
          >
            {loadError}
          </div>
        )}

        <div className="medicine-dispensing-content" style={{ display: "flex", gap: "24px" }}>
          <div
            className="medicine-patient-list"
            style={{
              flex: 1.4,
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #EAECF3",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #EAECF3",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Search size={16} color="#9AA1B9" />
              <input
                placeholder="Search patient, case #, or barangay..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  width: "100%",
                  color: "#12183A",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: columnTemplate,
                padding: "12px 20px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#9AA1B9",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                borderBottom: "1px solid #EAECF3",
              }}
            >
              <span style={{ cursor: "pointer" }} onClick={() => handleSort("full_name")}>
                Name<SortArrow column="full_name" sortConfig={sortConfig} />
              </span>
              {isSuperAdmin && (
                <span style={{ cursor: "pointer" }} onClick={() => handleSort("barangay_name")}>
                  Barangay<SortArrow column="barangay_name" sortConfig={sortConfig} />
                </span>
              )}
              <span style={{ cursor: "pointer" }} onClick={() => handleSort("next_pickup_due")}>
                Next Pickup<SortArrow column="next_pickup_due" sortConfig={sortConfig} />
              </span>
              <span style={{ cursor: "pointer" }} onClick={() => handleSort("remaining_days")}>
                Days Remaining<SortArrow column="remaining_days" sortConfig={sortConfig} />
              </span>
              <span style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
                Status<SortArrow column="status" sortConfig={sortConfig} />
              </span>
            </div>

            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#9AA1B9", fontSize: "13px" }}>
                  Loading patients...
                </div>
              ) : sortedPatients.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#9AA1B9", fontSize: "13px" }}>
                  No active patients found.
                </div>
              ) : (
                sortedPatients.map((p) => {
                  const overdue = p.status === "Critical";
                  return (
                    <div
                      key={p.patient_id}
                      onClick={() => setSelectedPatientId(p.patient_id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: columnTemplate,
                        alignItems: "center",
                        padding: "16px 20px",
                        borderBottom: "1px solid #F1F2F7",
                        cursor: "pointer",
                        backgroundColor:
                          selectedPatientId === p.patient_id ? "#EEF2FE" : "transparent",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "#12183A", fontSize: "14px" }}>
                          {p.full_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#9AA1B9" }}>
                          {p.regimen_type}
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <span style={{ fontSize: "13px", color: "#3C4560" }}>
                          {p.barangay_name || p.barangay_id}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: overdue ? 700 : 400,
                          color: overdue ? "#D4453D" : "#3C4560",
                        }}
                      >
                        {formatDate(p.next_pickup_due)}
                        {overdue && (
                          <div style={{ fontSize: "11px", fontWeight: 600 }}>Overdue</div>
                        )}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#12183A" }}>
                        {p.remaining_days === null ? "—" : `${p.remaining_days}d`}
                      </span>
                      <StatusPill status={p.status} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div
            className="medicine-dispensing-panel"
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: "12px",
              border: "1px solid #EAECF3",
              padding: "24px",
              height: "fit-content",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#12183A", marginTop: 0, marginBottom: "16px" }}>
              Give Take-Home Supply
            </h3>

            {!selectedPatient ? (
              <div
                style={{
                  fontSize: "13px",
                  color: "#9AA1B9",
                  padding: "24px 0",
                  textAlign: "center",
                  border: "1px dashed #E2E5F0",
                  borderRadius: "8px",
                }}
              >
                Select a patient from the list to hand out their next supply.
              </div>
            ) : (
              <>
                <div style={{ backgroundColor: "#F8F9FC", borderRadius: "8px", padding: "12px 14px", marginBottom: "18px" }}>
                  <div style={{ fontWeight: 700, color: "#12183A", fontSize: "14px" }}>
                    {selectedPatient.full_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                    {selectedPatient.regimen_type}
                  </div>
                  {isSuperAdmin && (
                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                      {selectedPatient.barangay_name || selectedPatient.barangay_id}
                    </div>
                  )}
                  <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "6px" }}>
                    Last pickup: {formatDate(selectedPatient.last_dispensed_date)}
                  </div>
                </div>

                <label style={{ fontSize: "12px", fontWeight: 600, color: "#3C4560", display: "block", marginBottom: "6px" }}>
                  Days of supply to give
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                  <button onClick={() => setDaysSupply((d) => Math.max(1, d - 1))} style={counterBtnStyle}>
                    −
                  </button>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#12183A", minWidth: "70px", textAlign: "center" }}>
                    {daysSupply} {daysSupply === 1 ? "day" : "days"}
                  </div>
                  <button onClick={() => setDaysSupply((d) => d + 1)} style={counterBtnStyle}>
                    +
                  </button>
                </div>

                <label style={{ fontSize: "12px", fontWeight: 600, color: "#3C4560", display: "block", marginBottom: "8px" }}>
                  Medicines to dispense (from {isSuperAdmin ? "the patient's barangay" : "barangay"} inventory)
                </label>
                <div style={{ marginBottom: "18px", maxHeight: "320px", overflowY: "auto" }}>
                  {inventoryItems.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#9AA1B9", padding: "12px 0" }}>
                      No medicines found in this barangay's inventory.
                    </div>
                  ) : (
                    inventoryItems.map((item) => {
                      const key = drugKey(item.drug_name, item.strength);
                      const qty = drugQuantities[key] || 0;
                      const isPrescribed = (selectedPatient.drug_regimen || []).some(
                        (r) => r.drug_name === item.drug_name && r.strength === item.strength
                      );
                      const insufficient = qty > item.remaining_stock;

                      return (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "10px 12px",
                            border: `1px solid ${insufficient ? "#F5C2C2" : "#E2E5F0"}`,
                            borderRadius: "8px",
                            marginBottom: "8px",
                            backgroundColor: insufficient ? "#FDEAEA" : "#FAFBFC",
                            gap: "10px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#12183A" }}>
                              {item.drug_name} {item.strength}
                              {isPrescribed && (
                                <span
                                  style={{
                                    marginLeft: "6px",
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    color: "#2F5CE0",
                                    backgroundColor: "#EEF2FE",
                                    padding: "2px 6px",
                                    borderRadius: "999px",
                                  }}
                                >
                                  PRESCRIBED
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#6B7280" }}>
                              {item.remaining_stock} {item.unit}(s) in stock
                              {insufficient && (
                                <span style={{ color: "#D4453D", fontWeight: 700 }}> · exceeds stock</span>
                              )}
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleQuantityChange(key, e.target.value)}
                            style={{
                              width: "70px",
                              border: "1px solid #E2E5F0",
                              borderRadius: "6px",
                              padding: "6px 8px",
                              fontSize: "13px",
                              textAlign: "center",
                            }}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                <label style={{ fontSize: "12px", fontWeight: 600, color: "#3C4560", display: "block", marginBottom: "6px" }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Given to guardian, patient reported mild nausea"
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid #E2E5F0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    resize: "none",
                    marginBottom: "18px",
                    boxSizing: "border-box",
                    color: "#12183A",
                  }}
                />

                <button
                  onClick={handleDispense}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    backgroundColor: submitting ? "#93a5e8" : "#2F5CE0",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Saving..." : "Confirm Supply Given"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dispensing Logs */}
        <div
          style={{
            marginTop: "24px",
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #EAECF3",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #EAECF3",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#12183A", margin: 0 }}>
              Dispensing Logs
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Search size={16} color="#9AA1B9" />
              <input
                placeholder="Search case #, patient, or drug..."
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
                style={{
                  border: "1px solid #E2E5F0",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "13px",
                  outline: "none",
                  width: "240px",
                }}
              />
            </div>
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "#FAFBFC" }}>
                  <th style={logHeaderStyle}>Date</th>
                  <th style={logHeaderStyle}>Patient</th>
                  {isSuperAdmin && <th style={logHeaderStyle}>Barangay</th>}
                  <th style={logHeaderStyle}>Drug</th>
                  <th style={logHeaderStyle}>Qty</th>
                  <th style={logHeaderStyle}>Days Supplied</th>
                  <th style={logHeaderStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan={logsColSpan} style={logEmptyStyle}>Loading logs...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={logsColSpan} style={logEmptyStyle}>No dispensing records found.</td>
                  </tr>
                ) : (
                  filteredLogs.map((record) => (
                    <tr key={record.dispense_id} style={{ borderTop: "1px solid #F1F2F7" }}>
                      <td style={logCellStyle}>{formatDate(record.dispense_date)}</td>
                      <td style={logCellStyle}>
                        {getPatientDisplayName(record.patient_id) || record.tb_case_number || record.patient_id}
                      </td>
                      {isSuperAdmin && (
                        <td style={logCellStyle}>
                          {barangayNameById[record.barangay_id] || record.barangay_id}
                        </td>
                      )}
                      <td style={logCellStyle}>{record.drug_name} {record.strength}</td>
                      <td style={logCellStyle}>{record.quantity_dispensed} {record.unit}(s)</td>
                      <td style={logCellStyle}>{record.days_supplied ?? "—"}</td>
                      <td style={logCellStyle}>{record.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {logsTotal > LOGS_LIMIT && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                borderTop: "1px solid #EAECF3",
                fontSize: "12px",
                color: "#6B7280",
              }}
            >
              <span>
                Showing {((logsPage - 1) * LOGS_LIMIT) + 1}–{Math.min(logsPage * LOGS_LIMIT, logsTotal)} of {logsTotal}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                  style={pageBtnStyle}
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setLogsPage((p) => (p * LOGS_LIMIT < logsTotal ? p + 1 : p))}
                  disabled={logsPage * LOGS_LIMIT >= logsTotal}
                  style={pageBtnStyle}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const counterBtnStyle = {
  width: "32px",
  height: "32px",
  borderRadius: "8px",
  border: "1px solid #E2E5F0",
  backgroundColor: "#F8F9FC",
  color: "#12183A",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
};

const logHeaderStyle = {
  textAlign: "left",
  padding: "10px 20px",
  fontSize: "11px",
  fontWeight: 600,
  color: "#9AA1B9",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  borderBottom: "1px solid #EAECF3",
};

const logCellStyle = {
  padding: "10px 20px",
  color: "#3C4560",
};

const logEmptyStyle = {
  padding: "32px 20px",
  textAlign: "center",
  color: "#9AA1B9",
};

const pageBtnStyle = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid #E2E5F0",
  backgroundColor: "#FFFFFF",
  fontSize: "12px",
  cursor: "pointer",
};