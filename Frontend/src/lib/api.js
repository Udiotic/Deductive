// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE || '';

function redirectToLogin(nextPath) {
  const currentPath = window.location.pathname;
  
  // Don't redirect if we're on password reset or verification pages
  if (currentPath.startsWith('/reset-password') || 
      currentPath.startsWith('/verify-email-code') ||
      currentPath.startsWith('/forgot-password')) {
    return; // Don't redirect, these pages should be accessible without auth
  }
  
  const next = encodeURIComponent(nextPath || window.location.pathname + window.location.search);
  // avoid redirect loop if we're already on /login
  if (!currentPath.startsWith('/login')) {
    window.location.assign(`/login?next=${next}`);
  }
}

let csrfToken = null;

export function invalidateCsrf() {
  csrfToken = null;
}

async function ensureCsrf() {
  if (!csrfToken) {
    const r = await fetch(`${API_BASE}/api/auth/csrf-token`, { credentials: 'include' });
    if (!r.ok) {
      // If even CSRF endpoint says 401, go login
      if (r.status === 401) redirectToLogin();
      throw new Error('Failed to get CSRF token');
    }
    const j = await r.json();
    csrfToken = j.csrfToken;
  }
  return csrfToken;
}

// src/lib/api.js
async function readError(res) {
  // If unauthorized anywhere, redirect to login with "next" param.
  if (res.status === 401) {
    redirectToLogin();
  }
  
  let msg = res.statusText || 'Request failed';
  let responseData = null;
  
  try {
    const j = await res.json();
    responseData = j; // ← Preserve the entire response data
    if (j?.message) msg = j.message;
  } catch {}
  
  const err = new Error(msg);
  err.status = res.status;
  err.response = { status: res.status, data: responseData }; // ← Add response structure
  err.data = responseData; // ← Also add direct data access
  throw err;
}


export async function get(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) return readError(res);
  return res.json();
}

export async function post(path, body) {
  let token = await ensureCsrf();
  const makeReq = () =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });

  let res = await makeReq();
  if (res.status === 403) {
    invalidateCsrf();
    token = await ensureCsrf();
    res = await makeReq();
  }
  if (!res.ok) return readError(res);
  return res.json();
}

export async function patch(path, body) {
  let token = await ensureCsrf();
  const makeReq = () =>
    fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    });

  let res = await makeReq();
  if (res.status === 403) {
    invalidateCsrf();
    token = await ensureCsrf();
    res = await makeReq();
  }
  if (!res.ok) return readError(res);
  return res.json();
}

export async function postForm(path, formData) {
  let token = await ensureCsrf();
  const makeReq = () =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': token },
      body: formData,
    });

  let r = await makeReq();
  if (r.status === 403) {
    invalidateCsrf();
    token = await ensureCsrf();
    r = await makeReq();
  }
  if (!r.ok) return readError(r);
  return r.json();
}
