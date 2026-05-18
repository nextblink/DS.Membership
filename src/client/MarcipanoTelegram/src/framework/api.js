const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request(method, path, body) {
  const token = sessionStorage.getItem('access_token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    if (!import.meta.env.DEV) {
      sessionStorage.clear();
      window.location.href = '/';
    }
    const body = await res.json().catch(() => null);
    const err = new Error(`HTTP 401: ${body?.reason ?? 'unauthorized'}`);
    err.response = { body };
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  delete: (path) => request('DELETE', path),
  upload: async (path, file) => {
    const token = sessionStorage.getItem('access_token');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};
