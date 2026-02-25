import { request } from '@/api/client';

export const getCategories = () => request('/protected/categories');

export const getPaymentMethods = () => request('/protected/payment-methods');

export const getBankAccount = () => request('/protected/banks');

export const getSmtpConfig = () => request('/protected/business/smtp');

export const getSmtpStatus = async () => {
  const response = await request('/protected/business/smtp/status');
  return response?.data || response;
};

export const updateBusiness = (payload) => request('/protected/business', { method: 'PUT', body: payload });

export const updateCategory = (categoryId, payload) => request(`/protected/categories/${categoryId}`, {
  method: 'PUT',
  body: payload
});

export const createCategory = (payload) => request('/protected/categories', { method: 'POST', body: payload });

export const deleteCategory = (categoryId) => request(`/protected/categories/${categoryId}`, { method: 'DELETE' });

export const updatePaymentMethods = (payload) => request('/protected/payment-methods', { method: 'POST', body: payload });

export const updateBankAccount = (payload) => request('/protected/banks', { method: 'PUT', body: payload });

export const updateSmtpConfig = (payload) => request('/protected/business/smtp', { method: 'PUT', body: payload });

export const testSmtpConfig = (payload) => request('/protected/business/smtp/test', { method: 'POST', body: payload });

export const getRolePermissions = () => request('/protected/role-permissions');

export const updateRolePermissions = (payload) => request('/protected/role-permissions', {
  method: 'PUT',
  body: payload
});
