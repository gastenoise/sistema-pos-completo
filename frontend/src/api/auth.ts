import { apiClient, ensureCsrfCookie } from './client';
import { normalizeEntityResponse } from '@/lib/normalizeResponse';

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

  // Construir nombre robusto desde múltiples posibles fuentes
  const extractName = () => {
    // Prioridad 1: name directo
    if (user.name && typeof user.name === 'string' && user.name.trim()) {
      return user.name.trim();
    }
    // Prioridad 2: full_name
    if (user.full_name && typeof user.full_name === 'string' && user.full_name.trim()) {
      return user.full_name.trim();
    }
    // Prioridad 3: fullname (variante sin guión)
    if (user.fullname && typeof user.fullname === 'string' && user.fullname.trim()) {
      return user.fullname.trim();
    }
    // Prioridad 4: combinación firstName + lastName
    const firstName = user.first_name ?? user.firstName ?? '';
    const lastName = user.last_name ?? user.lastName ?? '';
    if (firstName && typeof firstName === 'string' && firstName.trim()) {
      const parts = [firstName.trim(), lastName && typeof lastName === 'string' ? lastName.trim() : ''].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    // Fallback: vacío
    return '';
  };

  return {
    id: typeof user.id === 'number' ? user.id : undefined,
    name: extractName(),
    email: user.email ?? '',
    phone: user.phone ?? null,
    allowed_login_ip: user.allowed_login_ip ?? null,
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
  const data = await apiClient.post('/protected/auth/login', { email, password });
  setToken(data?.success);
  return normalizeEntityResponse(data);
};

export const fetchMe = async () => {
  const response = await apiClient.get('/protected/auth/me');
  const user = response?.user ?? normalizeEntityResponse(response);
  setToken(Boolean(user));
  return normalizeUserProfile(user);
};

export const updateMe = async (updates) => {
  const response = await apiClient.put('/protected/auth/me', updates);
  const user = response?.user ?? normalizeEntityResponse(response);
  return normalizeUserProfile(user);
};

export const logout = async () => {
  try {
    await apiClient.post('/protected/auth/logout', {});
  } catch (_error) {
    // Logout in UI should remain resilient even if backend is temporarily unreachable.
  } finally {
    clearToken();
  }
};
