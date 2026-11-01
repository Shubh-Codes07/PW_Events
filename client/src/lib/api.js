import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Authenticated API client that automatically attaches the Supabase session token
 * to requests directed to the backend.
 *
 * @param {string} endpoint - Path e.g. "/events" or "/events/123"
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<any>} Parsed response data
 */
export async function apiFetch(endpoint, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg =
      (isJson && data?.error?.message) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
