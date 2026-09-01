import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPages/SuperAdminPage';
import BarangayAdminPage from './pages/BarangayAdminPages/BarangayAdminPage';
import BarangayDetailPage from './pages/SuperAdminPages/SuperAdminBarangayDetail';
import BarangayAddNurse from './pages/BarangayAdminPages/BarangayAdminAddNursePage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<SuperAdminPage />} />
        <Route path="/dashboard/barangays/:barangay_id" element={<BarangayDetailPage />} />
        <Route path="/barangay-dashboard" element={<BarangayAdminPage />} />
        <Route path="/barangay/nurses/add" element={<BarangayAddNurse />} />
      </Routes>
    </Router>
  );
}

export default App;