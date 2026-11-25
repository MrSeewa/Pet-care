export function getToken() {
  return localStorage.getItem('petcare_token');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('petcare_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem('petcare_token', token);
  localStorage.setItem('petcare_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('petcare_token');
  localStorage.removeItem('petcare_user');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
}
