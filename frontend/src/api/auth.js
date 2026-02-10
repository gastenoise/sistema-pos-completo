import { request } from './client';

const TOKEN_KEY = 'pos_auth_token';

/** @typedef {import('@/types/user').CanonicalUserProfile} UserProfile */

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/**
 * Normaliza la carga útil del usuario autenticado para mantener un único contrato en frontend.
 * Backward compatibility: soporta `created_date` legado y lo expone como `created_at`.
 * @param {any} user
 * @returns {UserProfile | null}
 */
export const normalizeUserProfile = (user) => {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return {
    id: typeof user.id === 'number' ? user.id : undefined,
    name: user.name ?? user.full_name ?? '',
    email: user.email ?? '',
    phone: user.phone ?? null,
    email_verified_at: user.email_verified_at ?? null,
    created_at: user.created_at ?? user.created_date ?? null,
    updated_at: user.updated_at ?? null,
  };
};

export const getToken = () => {
  if (!canUseStorage()) {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (!canUseStorage()) {
    return;
  }
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
};

export const login = async (email, password) => {
  const data = await request('/protected/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  const token = data?.data?.token || data?.token || data?.access_token;
  if (token) {
    setToken(token);
  }
  return data?.data ?? data;
};

const authFetch = async (url, options = {}) => {
  const token = getToken();
  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return request(url, options);
};

export const fetchMe = async () => {
  const response = await authFetch('/protected/auth/me');
  const user = response?.data?.user ?? response?.user ?? response;
  return normalizeUserProfile(user);
};

export const updateMe = async (updates) => {
  const response = await authFetch('/protected/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  const user = response?.data?.user ?? response?.user ?? response;
  return normalizeUserProfile(user);
};
