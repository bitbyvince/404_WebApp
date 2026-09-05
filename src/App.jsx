import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPages/SuperAdminPage';
import BarangayAdminPage from './pages/BarangayAdminPages/BarangayAdminPage';
import BarangayDetailPage from './pages/SuperAdminPages/SuperAdminBarangayDetail';
import BarangayAddNurse from './pages/BarangayAdminPages/BarangayAdminAddNursePage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'patc']}>
              <SuperAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/barangays/:barangay_id"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'patc']}>
              <BarangayDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/barangay-dashboard"
          element={
            <ProtectedRoute allowedRoles={['barangay_admin', 'nurse']}>
              <BarangayAdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/barangay/nurses/add"
          element={
            <ProtectedRoute allowedRoles={['barangay_admin']}>
              <BarangayAddNurse />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;