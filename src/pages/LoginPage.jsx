import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../services/auth.service';

const LoginPage = () => {
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
      const data = await login(email, password);

      if (data.data?.accessToken) {
        const { accessToken, refreshToken, role, barangay_id, barangay_name, health_center_id, first_name, last_name } = data.data;

        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('admin', JSON.stringify({
          role,
          barangay_id: barangay_id || null,
          barangay_name: barangay_name || null,
          health_center_id: health_center_id || null,
          first_name,
          last_name,
        }));

        if (barangay_id) {
          localStorage.setItem('barangay_id', barangay_id);
        } else {
          localStorage.removeItem('barangay_id');
        }

        if (role === 'super_admin') {
          navigate('/dashboard');
        } else if (role === 'patc') {
          navigate('/dashboard');
        } else if (role === 'barangay_admin') {
          navigate('/barangay-dashboard');
        } else if (role === 'nurse') {
          navigate('/barangay-dashboard');
        } else {
          setError('Unrecognized account type.');
        }
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
        <div className="text-center">
          <h1 className="text-xl font-semibold text-zinc-900">RespiraTrack</h1>
          <p className="text-xs text-zinc-500 mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mt-6">
            <label className="text-xs text-zinc-700">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
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

export default LoginPage;