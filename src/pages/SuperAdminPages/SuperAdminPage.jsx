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
import MedicineDispensingPanel from "../BarangayAdminPages/MedicineDispensing";

const SuperAdminPage = () => {
  const location = useLocation();
  const [active, setActive] = useState(() => {
    return location.state?.activePanel
      || sessionStorage.getItem('superAdminActivePanel')
      || "Dashboard";
  });
  const [stockRequestCount, setStockRequestCount] = useState(0);
  const [missedDoseAlertCount, setMissedDoseAlertCount] = useState(0);

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

  useEffect(() => {
    loadStockRequestCount();
    loadMissedDoseAlertCount();
    const interval = setInterval(() => {
      loadStockRequestCount();
      loadMissedDoseAlertCount();
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStockRequestCount();
        loadMissedDoseAlertCount();
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
    { name: "Barangays", badge: stockRequestCount },
    "Patients",
    "Appointments",
    { name: "Compliance Monitoring", badge: missedDoseAlertCount },
    "Medicine Inventory",
    "Medicine Dispensing",
    "Reports",
    "Heat Map",
  ];

  const renderPanel = () => {
    switch (active) {
      case "Dashboard":             return <DashboardPanel />;
      case "Barangays":             return <BarangaysPanel />;
      case "Patients":              return <PatientsPanel />;
      case "Appointments":          return <AppointmentsPanel />;
      case "Compliance Monitoring": return <CompliancePanel />;
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
    >
      {renderPanel()}
    </Layout>
  );
};

export default SuperAdminPage;