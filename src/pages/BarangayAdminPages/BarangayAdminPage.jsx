import React, { useState } from "react";
import Layout from "../../components/Layout";

import DashboardPanel            from "./BarangayAdminDashboard";
import PatientsPanel             from "./BarangayAdminPatientsPage";
import AddPatientPanel           from "./BarangayAdminAddPatientsPage";
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

  const menuItems = [
    { name: "Dashboard" },
    { name: "Patients" },
    { name: "Add Patient" },
    { name: "Compliance Monitoring" },
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