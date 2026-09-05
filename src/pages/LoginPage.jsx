import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../services/auth.service';
import logo404 from '../assets/logo404.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex">
      <div className="hidden md:flex md:w-1/2 relative items-center bg-[linear-gradient(135deg,#0f2647_0%,#1a3a6b_50%,#1e4a8a_100%)] overflow-hidden">
        <div className="absolute right-[-15%] top-[8%] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_70%)]" />

        <div className="relative z-10 px-14 w-full max-w-[460px]">
          <div className="flex items-center gap-3 mb-10">
            <img src={logo404} alt="RespiraTrack logo" className="h-14 w-auto object-contain" />
            <span className="text-4xl font-bold text-white" style={{ fontFamily: "'Sora', sans-serif" }}>
              RespiraTrack
            </span>
          </div>

          <div className="inline-flex items-center border border-white/35 rounded-full px-4 py-1.5 text-[11px] font-medium text-white/85 tracking-wide mb-6">
            NTP — National TB Control Program
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
            Every dose,<br />
            <span className="text-[#e9b84a]">tracked and confirmed.</span>
          </h1>

          <p className="text-sm text-white/70 leading-relaxed max-w-[360px] mb-10">
            Log in to manage patient compliance, medicine stock, and treatment outcomes across your barangay.
          </p>

          <div className="flex gap-8 pt-8 border-t border-white/10">
            {[
              { value: '637', label: 'cases per 100K (PH)' },
              { value: '95%', label: 'cure rate with DOTS' },
              { value: '6 mo', label: 'standard treatment' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-extrabold text-[#e9b84a] leading-none">{stat.value}</div>
                <div className="text-[11px] text-white/55 mt-1.5 max-w-[80px] leading-snug">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#f0f4f9] px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-8">
            <img
              src={logo404}
              alt="RespiraTrack logo"
              onClick={() => navigate('/')}
              className="w-16 h-16 mx-auto mb-3 cursor-pointer"
            />
            <h1 className="text-xl font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>
              <span className="text-[#2d5fc4]">Respira</span>
              <span className="text-[#0f2647]">Track</span>
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-[#0f2647]">Welcome back</h2>
          <p className="text-sm text-[#5c7490] mt-1 mb-8">Sign in to manage your barangay's TB program.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[#4a6080]">Email</label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8ea3c2]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#c8d4e3] pl-9 pr-3 py-2.5 text-sm text-[#0f2647] focus:outline-none focus:ring-2 focus:ring-[#3b6fd4] focus:border-[#3b6fd4]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#4a6080]">Password</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8ea3c2]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-[#c8d4e3] pl-9 pr-9 py-2.5 text-sm text-[#0f2647] focus:outline-none focus:ring-2 focus:ring-[#3b6fd4] focus:border-[#3b6fd4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8ea3c2] hover:text-[#4a6080]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a3a6b] text-white py-2.5 rounded-lg font-semibold hover:bg-[#0f2647] transition disabled:bg-[#8ea3c2] disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
