// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE || '';

function redirectToLogin(nextPath) {
  const currentPath = window.location.pathname;
  
  // Don't redirect if we're on password reset or verification pages
  if (currentPath.startsWith('/reset-password') || 
      currentPath.startsWith('/verify-email-code') ||
      currentPath.startsWith('/forgot-password')) {
    return;
  }
  
  const next = encodeURIComponent(nextPath || window.location.pathname + window.location.search);
  // avoid redirect loop if we're already on /login
  if (!currentPath.startsWith('/login')) {
    window.location.assign(`/login?next=${next}`);
  }
}

// ✅ JWT token management
function getToken() {
  return localStorage.getItem('authToken');
}

function setToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

// ✅ Build headers with JWT auth
function getAuthHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return headers;
}

async function readError(res) {
  // If unauthorized anywhere, clear token and redirect
  if (res.status === 401) {
    setToken(null); // ✅ Clear invalid token
    redirectToLogin();
  }
  
  let msg = res.statusText || 'Request failed';
  let responseData = null;
  
  try {
    const j = await res.json();
    responseData = j;
    if (j?.message) msg = j.message;
  } catch {}
  
  const err = new Error(msg);
  err.status = res.status;
  err.response = { status: res.status, data: responseData };
  err.data = responseData;
  throw err;
}

export async function get(path) {
  const token = getToken();
  const headers = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const res = await fetch(`${API_BASE}${path}`, { 
    headers,
    // ✅ Remove credentials - JWT doesn't need cookies
  });
  if (!res.ok) return readError(res);
  return res.json();
}

export async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: getAuthHeaders(), // ✅ Include JWT in headers
    body: JSON.stringify(body ?? {}),
  });
  
  // ✅ Handle login response with token
  if (res.ok && (path === '/api/auth/login' || path === '/api/auth/verify-email-code')) {
    const data = await res.json();
    if (data.token) {
      setToken(data.token); // ✅ Store JWT token
    }
    return data;
  }
  
  if (!res.ok) return readError(res);
  return res.json();
}

export async function patch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: getAuthHeaders(), // ✅ Include JWT in headers
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) return readError(res);
  return res.json();
}

export async function postForm(path, formData) {
  const token = getToken();
  const headers = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // ✅ Don't set Content-Type for FormData
  
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) return readError(res);
  return res.json();
}

// ✅ Add DELETE method for unfollow functionality
export async function del(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) return readError(res);
  return res.json();
}

// ✅ Export token management for AuthProvider
export { getToken, setToken };
