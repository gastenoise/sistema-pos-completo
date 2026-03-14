import { clearToken, getToken } from './auth';
import { API_MESSAGES } from '@/lib/toastMessages';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '';
const BUSINESS_STORAGE_KEY = 'pos_current_business';
const CSRF_COOKIE_ENDPOINT = '/sanctum/csrf-cookie';
const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let businessContext = null;
let didNotifySessionExpired = false;
let csrfCookiePromise = null;

const AUTH_MESSAGE_REGEX = /not authenticated|unauthenticated|unauthorized|token|session/i;
const DEFAULT_ERROR_MESSAGE = API_MESSAGES.defaultError;

export interface HttpError extends Error {
  status?: number;
  data?: any;
}

/**
 * @param {string} message
 * @param {number} [status]
 * @param {any} [data]
 * @returns {HttpError}
 */
const createHttpError = (message: string, status?: number, data?: any): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.data = data;
  return error;
};

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

const buildUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!API_BASE_URL) {
    // If we reach here, we're making a relative request but no base URL is defined.
    // In a Vite/Vercel environment, this would default to the current domain.
    // We throw an error to prevent requests from leaking to the frontend domain.
    throw new Error(`API_BASE_URL (VITE_API_URL) is not defined. Cannot build absolute URL for: ${path}`);
  }

  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.replace(/^\/+/, '');
  return `${base}/${suffix}`;
};


const readCookie = (name: string) => {
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
    throw new Error(API_MESSAGES.csrfInitError);
  }
};

const resolveBusinessId = (): number | string | null => {
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

const normalizeBody = (options: any) => {
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

const extractErrorMessage = (payload: any, fallback = DEFAULT_ERROR_MESSAGE) => {
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

const parseErrorPayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  return response.text().catch(() => null);
};

const parseSuccessPayload = async (response: Response, responseType = 'auto') => {
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
      throw createHttpError(API_MESSAGES.unexpectedHtmlResponse, response.status, data);
    }
  }

  return data;
};

const parseResponse = async (response: Response, responseType = 'auto') => {
  if (!response.ok) {
    const data = await parseErrorPayload(response);
    const message = isAuthFailure(response.status, data)
      ? API_MESSAGES.sessionExpired
      : extractErrorMessage(data, response.statusText || DEFAULT_ERROR_MESSAGE);
    throw createHttpError(message, response.status, data);
  }

  return parseSuccessPayload(response, responseType);
};

export const setBusinessContext = (context: any) => {
  businessContext = context;
};

export const clearBusinessContext = () => {
  businessContext = null;
};

const request = async (path: string, options: any = {}) => {
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
    headers.set('X-Business-Id', String(businessId));
  }

  const { responseType = 'auto', includeMeta = false, ...fetchOptions } = normalizedOptions;

  const response = await fetch(buildUrl(path), {
    ...fetchOptions,
    headers,
    credentials: 'include'
  }).catch((caughtError) => {
    if (token) {
      notifySessionExpired('api_unreachable');
    }
    const error = caughtError as any;
    if (error && typeof error === 'object') {
      error.message = 'Unable to connect to server. Check your internet connection and try again.';
    }
    throw caughtError;
  });

  const parsed = await parseResponse(response, responseType).catch((caughtError) => {
    const error = caughtError as any;
    if (token && isAuthFailure(error?.status, error?.data)) {
      notifySessionExpired();
    }
    throw caughtError;
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

export { request };

export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};
