import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { loginSuperAdmin } from '../../services/auth.service';

const BuildingIcon = () => (
  <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl">
    🏢
  </div>
);

const SuperAdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await loginSuperAdmin(email, password);

      if (data.data?.accessToken) {
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('admin', JSON.stringify({ role: data.data.role }));
        
        navigate('/dashboard');
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
          <BuildingIcon />
        </div>

        <h1 className="text-center text-xl font-semibold mt-4 text-zinc-900">
          Super Admin Login
        </h1>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mt-6">
            <label className="text-xs text-zinc-900">Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs text-zinc-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;