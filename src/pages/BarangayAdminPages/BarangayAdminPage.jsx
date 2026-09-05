import React, { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { fetchMissedDoseAlerts } from "../../services/alert.service.js";

import DashboardPanel            from "./BarangayAdminDashboard";
import PatientsPanel             from "./BarangayAdminPatientsPage";
import AddPatientPanel           from "./BarangayAdminAddPatientsPage";
import AppointmentsPanel         from "./BarangayAdminAppointmentsPage";
import ComplianceMonitoringPanel from "./BarangayAdminCompliancePage";
import MedicineInventoryPanel    from "./BarangayAdminInventoryPage";
import ReportsPanel              from "./BarangayAdminReportsPage";
import HeatMapPanel              from "./BarangayAdminHeatMap";
import NurseManagementPanel      from "./BarangayAdminAddNursePage";
import MedicineDispensingPanel   from "./MedicineDispensing";

const BarangayAdminPage = () => {
  const [active, setActive] = useState("Dashboard");

  const admin        = JSON.parse(localStorage.getItem("admin") || "{}");
  const barangayName = admin?.barangay_name || "Barangay Admin";
  const [missedDoseAlertCount, setMissedDoseAlertCount] = useState(0);

  const loadMissedDoseAlertCount = async () => {
    try {
      const data = await fetchMissedDoseAlerts();
      if (data.success) {
        const active = (data.data?.alerts || []).filter((a) => a.status !== "Resolved");
        setMissedDoseAlertCount(active.length);
      }
    } catch (err) {
      console.error("Failed to load missed dose alert count:", err);
    }
  };

  useEffect(() => {
    loadMissedDoseAlertCount();
    const interval = setInterval(loadMissedDoseAlertCount, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadMissedDoseAlertCount();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const menuItems = [
    { name: "Dashboard" },
    { name: "Patients" },
    { name: "Add Patient" },
    { name: "Appointments" },
    { name: "Compliance Monitoring", badge: missedDoseAlertCount },
    { name: "Medicine Inventory" },
    { name: "Medicine Dispensing" },
    { name: "Reports" },
    { name: "Heat Map" },
    ...(admin?.role !== "nurse" ? [{ name: "Nurse Management" }] : []),
  ];

  const renderPanel = () => {
    switch (active) {
      case "Dashboard":             return <DashboardPanel />;
      case "Patients":              return <PatientsPanel />;
      case "Add Patient":           return <AddPatientPanel />;
      case "Appointments":          return <AppointmentsPanel />;
      case "Compliance Monitoring": return <ComplianceMonitoringPanel />;
      case "Medicine Inventory":    return <MedicineInventoryPanel />;
      case "Reports":               return <ReportsPanel />;
      case "Heat Map":              return <HeatMapPanel />;
      case "Nurse Management":      return <NurseManagementPanel />;
      case "Medicine Dispensing":   return <MedicineDispensingPanel />;
      default:                      return <DashboardPanel />;
      
    }
  };

  return (
    <Layout
      menuItems={menuItems}
      activeMenu={active}
      setActiveMenu={setActive}
      title={active}
      subtitle={barangayName}
    >
      {renderPanel()}
    </Layout>
  );
};

export default BarangayAdminPage;