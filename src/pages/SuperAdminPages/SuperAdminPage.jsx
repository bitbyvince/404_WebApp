import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom"; // 👈 add
import Layout from "../../components/Layout";
import DashboardPanel from "./SuperAdminDashboard";
import BarangaysPanel from "./SuperAdminBarangayPage";
import PatientsPanel from "./SuperAdminPatientsPage";
import CompliancePanel from "./SuperAdminCompliancePage";
import InventoryPanel from "./SuperAdminInventoryPage";
import ReportsPanel from "./SuperAdminReportsPage";
import HeatMapPanel from "./SuperAdminHeatMap";
import { fetchStockRequestAlerts } from "../../services/alert.service.js";

const SuperAdminPage = () => {
  const location = useLocation();
  const [active, setActive] = useState(() => {
    return location.state?.activePanel
      || sessionStorage.getItem('superAdminActivePanel')
      || "Dashboard";
  });
  const [stockRequestCount, setStockRequestCount] = useState(0);

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

  useEffect(() => {
    loadStockRequestCount();
    const interval = setInterval(loadStockRequestCount, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadStockRequestCount();
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
    "Compliance Monitoring",
    "Medicine Inventory",
    "Reports",
    "Heat Map",
  ];

  const renderPanel = () => {
    switch (active) {
      case "Dashboard":             return <DashboardPanel />;
      case "Barangays":             return <BarangaysPanel />;
      case "Patients":              return <PatientsPanel />;
      case "Compliance Monitoring": return <CompliancePanel />;
      case "Medicine Inventory":    return <InventoryPanel />;
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