const API = import.meta.env.VITE_API_URL;

export const login = async (email, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (data.success && data.data?.accessToken) {
      localStorage.setItem('token', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data.accessToken;
    }
    return null;
  } catch (err) {
    console.error('Token refresh failed:', err);
    return null;
  }
};

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const doFetch = (tok) => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${tok}` },
  });

  let res = await doFetch(token);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('admin');
      localStorage.removeItem('barangay_id');
      window.location.href = '/login';
      return res;
    }
  }

  return res;
};