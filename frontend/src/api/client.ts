import axios from 'axios';
import { clearToken, getToken } from './auth';
import { API_MESSAGES } from '@/lib/toastMessages';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '';
const BUSINESS_STORAGE_KEY = 'pos_current_business';
const CSRF_COOKIE_ENDPOINT = '/sanctum/csrf-cookie';
const CSRF_RESPONSE_HEADERS = ['x-xsrf-token', 'x-csrf-token'];
const SHOULD_DEBUG_XSRF = import.meta.env.DEV || import.meta.env.VITE_DEBUG_XSRF === 'true';

let businessContext = null;
let didNotifySessionExpired = false;
let csrfCookiePromise = null;
let csrfToken: string | null = null;

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

const resolveCsrfToken = (headers: Record<string, string | undefined> = {}) => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  const token = CSRF_RESPONSE_HEADERS
    .map((headerName) => normalizedHeaders[headerName])
    .find((value) => typeof value === 'string' && value.length > 0);
  return token ?? null;
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

const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
});

export const ensureCsrfCookie = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (csrfToken) {
    return;
  }

  if (!csrfCookiePromise) {
    csrfCookiePromise = instance
      .get(CSRF_COOKIE_ENDPOINT)
      .then((response) => {
        csrfToken = resolveCsrfToken(response?.headers as Record<string, string | undefined>);
      })
      .finally(() => {
        csrfCookiePromise = null;
      });
  }

  try {
    await csrfCookiePromise;
  } catch (error) {
    throw new Error(API_MESSAGES.csrfInitError);
  }
};

instance.interceptors.request.use(async (config) => {
  // Enforce absolute backend URLs if VITE_API_URL is defined,
  // or throw if we are about to make a relative request without a base URL.
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    if (!API_BASE_URL) {
      throw new Error(`API_BASE_URL (VITE_API_URL) is not defined. Cannot build absolute URL for: ${config.url}`);
    }
  }

  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    await ensureCsrfCookie();
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  if (SHOULD_DEBUG_XSRF && method === 'POST' && config.url === '/protected/auth/login') {
    const hasXsrfHeader = Boolean(config.headers?.['X-XSRF-TOKEN']);
    console.debug('[api] login request X-XSRF-TOKEN present:', hasXsrfHeader);
  }

  const businessId = resolveBusinessId();
  if (businessId) {
    config.headers['X-Business-Id'] = String(businessId);
  }

  return config;
});

instance.interceptors.response.use(
  (response) => {
    if (getToken()) {
      didNotifySessionExpired = false;
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json') && typeof response.data === 'string') {
      const looksLikeHtml = /<!doctype html|<html|<head|<body|<div id="root">/i.test(response.data);
      if (looksLikeHtml) {
        throw createHttpError(API_MESSAGES.unexpectedHtmlResponse, response.status, response.data);
      }
    }

    return response;
  },
  (error) => {
    const { response } = error;
    if (response) {
      if (getToken() && isAuthFailure(response.status, response.data)) {
        notifySessionExpired();
      }

      const message = isAuthFailure(response.status, response.data)
        ? API_MESSAGES.sessionExpired
        : extractErrorMessage(response.data, response.statusText || DEFAULT_ERROR_MESSAGE);

      return Promise.reject(createHttpError(message, response.status, response.data));
    } else {
      if (getToken()) {
        notifySessionExpired('api_unreachable');
      }
      error.message = 'Unable to connect to server. Check your internet connection and try again.';
      return Promise.reject(error);
    }
  }
);

export const setBusinessContext = (context: any) => {
  businessContext = context;
};

export const clearBusinessContext = () => {
  businessContext = null;
};

const request = async (path: string, options: any = {}) => {
  const { responseType = 'json', includeMeta = false, body, data, ...rest } = options;

  try {
    const response = await instance({
      url: path,
      responseType,
      data: body ?? data,
      ...rest,
    });

    if (includeMeta) {
      return {
        data: response.data,
        status: response.status,
        headers: response.headers
      };
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

export { request };

export const apiClient = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', data: body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', data: body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', data: body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};
