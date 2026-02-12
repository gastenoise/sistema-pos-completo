import { request, ensureCsrfCookie } from './client';

/** @typedef {import('@/types/user').CanonicalUserProfile} UserProfile */

let hasActiveSessionHint = false;

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

export const getToken = () => (hasActiveSessionHint ? 'cookie-session' : null);

export const setToken = (token) => {
  hasActiveSessionHint = Boolean(token);
};

export const clearToken = () => {
  hasActiveSessionHint = false;
};

export const login = async (email, password) => {
  await ensureCsrfCookie();
  const data = await request('/protected/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  setToken(data?.success);
  return data?.data ?? data;
};

const authFetch = async (url, options = {}) => request(url, options);

export const fetchMe = async () => {
  const response = await authFetch('/protected/auth/me');
  const user = response?.data?.user ?? response?.user ?? response;
  setToken(Boolean(user));
  return normalizeUserProfile(user);
};

export const updateMe = async (updates) => {
  await ensureCsrfCookie();
  const response = await authFetch('/protected/auth/me', {
    method: 'PUT',
    body: updates
  });
  const user = response?.data?.user ?? response?.user ?? response;
  return normalizeUserProfile(user);
};

export const logout = async () => {
  try {
    await ensureCsrfCookie();
    await request('/protected/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
};
