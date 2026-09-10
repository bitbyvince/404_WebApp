import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // 👈 add
import Layout from "../../components/Layout";
import DashboardPanel from "./SuperAdminDashboard";
import BarangaysPanel from "./SuperAdminBarangayPage";
import PatientsPanel from "./SuperAdminPatientsPage";
import AppointmentsPanel from "./SuperAdminAppointmentsPage";
import CompliancePanel from "./SuperAdminCompliancePage";
import InventoryPanel from "./SuperAdminInventoryPage";
import ReportsPanel from "./SuperAdminReportsPage";
import HeatMapPanel from "./SuperAdminHeatMap";
import { fetchStockRequestAlerts, fetchMissedDoseAlerts } from "../../services/alert.service.js";
import { createPatcAccount } from "../../services/barangay.service.js";
import { fetchSymptomLogs } from "../../services/symptomLog.service.js";
import MedicineDispensingPanel from "../BarangayAdminPages/MedicineDispensing";
import SymptomLogsPanel from "../SymptomLogsPage";

const SuperAdminPage = () => {
  const location = useLocation();
  const [active, setActive] = useState(() => {
    return location.state?.activePanel
      || sessionStorage.getItem('superAdminActivePanel')
      || "Dashboard";
  });
  const [stockRequestCount, setStockRequestCount] = useState(0);
  const [missedDoseAlertCount, setMissedDoseAlertCount] = useState(0);
  const [unreviewedSymptomCount, setUnreviewedSymptomCount] = useState(0);

  const currentRole = (() => {
    try {
      return JSON.parse(localStorage.getItem('admin') || '{}').role;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentRole === 'super_admin';

  // ── Create PATC Account (lives in the sidebar, not tied to any one tab) ──
  const [showPatcModal, setShowPatcModal] = useState(false);
  const [patcForm, setPatcForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
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
      const data = await createPatcAccount(patcForm);
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

  const closePatcModal = () => { setShowPatcModal(false); setPatcErrors([]); setPatcSuccess(''); };

  useEffect(() => {
    sessionStorage.setItem('superAdminActivePanel', active);
  }, [active]);

  useEffect(() => {
    if (location.state?.activePanel) {
      setActive(location.state.activePanel);
    }
  }, [location.state]);

  const loadStockRequestCount = async () => {
    try {
      const data = await fetchStockRequestAlerts();
      if (data.success) {
        const ongoing = (data.data?.alerts || []).filter((a) => a.status !== 'Resolved');
        setStockRequestCount(ongoing.length);
      }
    } catch (err) {
      console.error('Failed to load stock request count:', err);
    }
  };

  const loadMissedDoseAlertCount = async () => {
    try {
      const data = await fetchMissedDoseAlerts();
      if (data.success) {
        const active = (data.data?.alerts || []).filter((a) => a.status !== 'Resolved');
        setMissedDoseAlertCount(active.length);
      }
    } catch (err) {
      console.error('Failed to load missed dose alert count:', err);
    }
  };

  const loadUnreviewedSymptomCount = async () => {
    try {
      const data = await fetchSymptomLogs({ reviewed: 'false', limit: 1 });
      if (data.success) setUnreviewedSymptomCount(data.data?.total ?? 0);
    } catch (err) {
      console.error('Failed to load unreviewed symptom count:', err);
    }
  };

  useEffect(() => {
    loadStockRequestCount();
    loadMissedDoseAlertCount();
    loadUnreviewedSymptomCount();
    const interval = setInterval(() => {
      loadStockRequestCount();
      loadMissedDoseAlertCount();
      loadUnreviewedSymptomCount();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStockRequestCount();
        loadMissedDoseAlertCount();
        loadUnreviewedSymptomCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const menuItems = [
    "Dashboard",
    { name: "Health Centers", badge: stockRequestCount },
    "Patients",
    "Appointments",
    { name: "Compliance Monitoring", badge: missedDoseAlertCount },
    { name: "Symptom Logs", badge: unreviewedSymptomCount },
    "Medicine Inventory",
    "Medicine Dispensing",
    "Reports",
    "Heat Map",
  ];

  const renderPanel = () => {
    switch (active) {
      case "Dashboard":             return <DashboardPanel />;
      case "Health Centers":        return <BarangaysPanel />;
      case "Patients":              return <PatientsPanel />;
      case "Appointments":          return <AppointmentsPanel />;
      case "Compliance Monitoring": return <CompliancePanel />;
      case "Symptom Logs":          return <SymptomLogsPanel />;
      case "Medicine Inventory":    return <InventoryPanel />;
      case "Medicine Dispensing": return <MedicineDispensingPanel />;
      case "Reports":               return <ReportsPanel />;
      case "Heat Map":              return <HeatMapPanel />;
      default:                      return <DashboardPanel />;
    }
  };

  return (
    <Layout
      menuItems={menuItems}
      activeMenu={active}
      setActiveMenu={setActive}
      title={active}
      subtitle="Municipal Admin"
      sidebarFooter={isSuperAdmin && (
        <>
          <button
            onClick={() => setShowPatcModal(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            + Create PATC Account
          </button>

          {showPatcModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-800">Create PATC Account</h2>
                  <button onClick={closePatcModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
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
                    <button type="button" onClick={closePatcModal} className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition">
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
        </>
      )}
    >
      {renderPanel()}
    </Layout>
  );
};

export default SuperAdminPage;