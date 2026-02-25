import { apiClient } from '@/api/client';

export const getCategories = () => apiClient.get('/protected/categories');

export const getPaymentMethods = () => apiClient.get('/protected/payment-methods');

export const getBankAccount = () => apiClient.get('/protected/banks');

export const getSmtpConfig = () => apiClient.get('/protected/business/smtp');

export const updateBusiness = (payload) => apiClient.put('/protected/business', payload);

export const updateCategory = (categoryId, payload) => apiClient.put(`/protected/categories/${categoryId}`, payload);

export const createCategory = (payload) => apiClient.post('/protected/categories', payload);

export const deleteCategory = (categoryId) => apiClient.delete(`/protected/categories/${categoryId}`);

export const updatePaymentMethods = (payload) => apiClient.post('/protected/payment-methods', payload);

export const updateBankAccount = (payload) => apiClient.put('/protected/banks', payload);

export const updateSmtpConfig = (payload) => apiClient.put('/protected/business/smtp', payload);

export const testSmtpConfig = (payload) => apiClient.post('/protected/business/smtp/test', payload);

export const getRolePermissions = () => apiClient.get('/protected/role-permissions');

export const updateRolePermissions = (payload) => apiClient.put('/protected/role-permissions', payload);
