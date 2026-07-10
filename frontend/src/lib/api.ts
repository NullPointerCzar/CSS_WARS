/**
 * API helper with automatic auth headers.
 *
 * Every admin API call should use these helpers instead of manually
 * attaching x-admin-pin or x-user-id headers.
 */

import { getIdentity } from './identity.js';

function getAuthHeaders(): Record<string, string> {
  const identity = getIdentity();
  if (!identity) return {};
  return { 'x-user-id': identity.id };
}

/**
 * Thin wrapper around fetch for admin API calls.
 * Automatically attaches auth headers, parses JSON, and throws on errors.
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete<T = any>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiUpload<T = any>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      // note: no Content-Type — browser sets multipart/form-data with boundary
      ...getAuthHeaders(),
    },
    body: formData,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Upload failed: ${res.status}`);
  }
  return res.json();
}
