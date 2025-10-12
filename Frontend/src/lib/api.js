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
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) return readError(res);
  return res.json();
}

export async function patch(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) return readError(res);
  return res.json();
}

export async function postForm(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) return readError(res);
  return res.json();
}
