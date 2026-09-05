import { Navigate } from 'react-router-dom';

// Guards a route against direct navigation with no (or wrong-role) session.
// authFetch already redirects on a 401 from the API, but that only fires
// after a request goes out — this stops the protected page shell itself
// from rendering first.
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');

  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
