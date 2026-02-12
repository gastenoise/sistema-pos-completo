import { clearToken, getToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const BUSINESS_STORAGE_KEY = 'pos_current_business';
const CSRF_COOKIE_ENDPOINT = '/sanctum/csrf-cookie';
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let businessContext = null;
let didNotifySessionExpired = false;
let csrfCookiePromise = null;

const AUTH_MESSAGE_REGEX = /not authenticated|unauthenticated|unauthorized|token|session/i;
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const notifySessionExpired = (reason = 'session_expired') => {
  clearToken();
  if (typeof window !== 'undefined' && !didNotifySessionExpired) {
    didNotifySessionExpired = true;
    window.dispatchEvent(new CustomEvent('session-expired', {
      detail: { reason }
    }));
  }
};

const isAuthFailure = (status, payload) => {
  if (status === 401) {
    return true;
  }
  if (status !== 403) {
    return false;
  }
  const message = typeof payload === 'string'
    ? payload
    : payload?.message || payload?.error || '';
  return AUTH_MESSAGE_REGEX.test(message);
};

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


const readCookie = (name) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const escapedName = name.replace(/[-[\]{}()*+?.,\^$|#\s]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const ensureCsrfCookie = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (readCookie('XSRF-TOKEN')) {
    return;
  }

  if (!csrfCookiePromise) {
    csrfCookiePromise = fetch(buildUrl(CSRF_COOKIE_ENDPOINT), {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }).finally(() => {
      csrfCookiePromise = null;
    });
  }

  const response = await csrfCookiePromise;
  if (!response.ok) {
    throw new Error('Unable to initialize CSRF protection.');
  }
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

const extractErrorMessage = (payload, fallback = DEFAULT_ERROR_MESSAGE) => {
  if (typeof payload === 'string') {
    return payload || fallback;
  }
  if (Array.isArray(payload?.errors)) {
    const firstError = payload.errors.find(Boolean);
    if (firstError) return firstError;
  }
  if (payload?.errors && typeof payload.errors === 'object') {
    const firstErrorGroup = Object.values(payload.errors).find((value) => Array.isArray(value) && value.length > 0);
    if (firstErrorGroup?.[0]) {
      return firstErrorGroup[0];
    }
  }
  return payload?.message || payload?.error || fallback;
};

const parseErrorPayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
};

const parseSuccessPayload = async (response, responseType = 'auto') => {
  if (response.status === 204) {
    return null;
  }

  if (responseType === 'blob') {
    return response.blob();
  }

  if (responseType === 'text') {
    return response.text().catch(() => null);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!isJson && typeof data === 'string') {
    const looksLikeHtml = /<!doctype html|<html|<head|<body|<div id="root">/i.test(data);
    if (looksLikeHtml) {
      const error = new Error('Unexpected HTML response. Check VITE_API_BASE_URL.');
      error.status = response.status;
      error.data = data;
      throw error;
    }
  }

  return data;
};

const parseResponse = async (response, responseType = 'auto') => {
  if (!response.ok) {
    const data = await parseErrorPayload(response);
    const message = isAuthFailure(response.status, data)
      ? 'Your session has expired. Please log in again.'
      : extractErrorMessage(data, response.statusText || DEFAULT_ERROR_MESSAGE);
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return parseSuccessPayload(response, responseType);
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
  const method = String(normalizedOptions.method || 'GET').toUpperCase();

  const isMultipartBody = normalizedOptions.body instanceof FormData;

  if (normalizedOptions.body && !isMultipartBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  const shouldIncludeCsrf = CSRF_METHODS.has(method);
  if (shouldIncludeCsrf) {
    await ensureCsrfCookie();
    const csrfToken = readCookie('XSRF-TOKEN');
    if (csrfToken && !headers.has('X-XSRF-TOKEN')) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  const businessId = resolveBusinessId();
  if (businessId) {
    headers.set('X-Business-Id', businessId);
  }

  const { responseType = 'auto', includeMeta = false, ...fetchOptions } = normalizedOptions;

  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    headers,
    credentials: 'include'
  }).catch((error) => {
    if (token) {
      notifySessionExpired('api_unreachable');
    }
    error.message = 'Unable to connect to server. Check your internet connection and try again.';
    throw error;
  });

  const parsed = await parseResponse(response, responseType).catch((error) => {
    if (token && isAuthFailure(error?.status, error?.data)) {
      notifySessionExpired();
    }
    throw error;
  });

  if (token) {
    didNotifySessionExpired = false;
  }

  if (includeMeta) {
    return {
      data: parsed,
      status: response.status,
      headers: response.headers
    };
  }

  return parsed;
};

export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};
