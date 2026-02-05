import { clearToken, getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const BUSINESS_STORAGE_KEY = 'pos_current_business';

let businessContext = null;

const buildUrl = (path) => {
  if (!API_BASE_URL) {
    return path;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.replace(/^\/+/, '');
  return `${base}/${suffix}`;
};

const resolveBusinessId = () => {
  if (businessContext?.business_id) {
    return businessContext.business_id;
  }
  if (businessContext?.id) {
    return businessContext.id;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(BUSINESS_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed?.business_id ?? parsed?.id ?? null;
  } catch (error) {
    return null;
  }
};

const normalizeBody = (options) => {
  if (!options?.body) {
    return options;
  }
  if (options.body instanceof FormData
    || options.body instanceof URLSearchParams
    || options.body instanceof Blob
    || typeof options.body === 'string') {
    return options;
  }
  if (typeof options.body === 'object') {
    return {
      ...options,
      body: JSON.stringify(options.body)
    };
  }
  return options;
};

const parseResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (response.ok && !isJson && typeof data === 'string') {
    const looksLikeHtml = /<!doctype html|<html|<head|<body|<div id="root">/i.test(data);
    if (looksLikeHtml) {
      const error = new Error('Unexpected HTML response. Check VITE_API_BASE_URL.');
      error.status = response.status;
      error.data = data;
      throw error;
    }
  }

  if (!response.ok) {
    const message = typeof data === 'string'
      ? data
      : data?.message || response.statusText || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const setBusinessContext = (context) => {
  businessContext = context;
};

export const clearBusinessContext = () => {
  businessContext = null;
};

export const request = async (path, options = {}) => {
  const token = getToken();
  const normalizedOptions = normalizeBody(options);
  const headers = new Headers(normalizedOptions.headers || {});

  if (normalizedOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const businessId = resolveBusinessId();
  if (businessId) {
    headers.set('X-Business-Id', businessId);
  }

  const response = await fetch(buildUrl(path), {
    ...normalizedOptions,
    headers
  });

  if (response.status === 401 && token) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
  }

  return parseResponse(response);
};

export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};
