import { request } from './client';

const TOKEN_KEY = 'pos_auth_token';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

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
  return response?.data?.user ?? response?.user ?? response;
};

export const updateMe = async (updates) => {
  const response = await authFetch('/protected/auth/me', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return response?.data?.user ?? response?.user ?? response;
};
