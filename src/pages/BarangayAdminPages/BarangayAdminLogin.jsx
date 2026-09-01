import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { loginBarangayAdmin } from '../../services/auth.service';

const PeopleIcon = () => (
  <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">
    👥
  </div>
);

const BarangayAdminLogin = () => {
  const navigate = useNavigate();
  const [barangay, setBarangay] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const barangays = [
    'Barangay Caniogan',
    'Barangay Bambang',
    'Barangay Nagpayong',
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginBarangayAdmin(email, password, barangay); // ✅ pass barangay

      if (data.data?.accessToken) {
        // ✅ Validate barangay matches the account
        if (data.data.barangay_name && data.data.barangay_name !== barangay) {
          setError('Selected barangay does not match your account.');
          return;
        }

        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('barangay_id', data.data.barangay_id);
        localStorage.setItem('admin', JSON.stringify({
          role: data.data.role,
          barangay_id: data.data.barangay_id,
          barangay_name: data.data.barangay_name
        }));
        navigate('/barangay-dashboard');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Connection error. Is backend running on port 3000?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <Link to="/" className="text-xs text-blue-500 hover:underline">
          ← Back to role selection
        </Link>

        <div className="flex justify-center mt-6">
          <PeopleIcon />
        </div>

        <h1 className="text-center text-xl font-semibold mt-4 text-zinc-900">
          Barangay Admin Login
        </h1>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mt-6">
            <label className="text-xs text-zinc-600">Barangay</label>
            <select
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select Barangay</option>
              {barangays.map((bar) => (
                <option key={bar} value={bar}>{bar}</option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-xs text-zinc-600">Email</label>
            <input
              required
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs text-zinc-600">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default BarangayAdminLogin;