import { apiClient } from '@/api/client';
import { mapCatalogIsActive, withCatalogIsActive } from '@/lib/catalogNaming';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

export const getCategories = async () => mapCatalogIsActive(normalizeListResponse(await apiClient.get('/protected/categories'), 'categories'));

export const getPaymentMethods = async () => normalizeListResponse(await apiClient.get('/protected/payment-methods'), 'payment_methods').map((method) => {
  const normalizedMethod = withCatalogIsActive(method);
  return {
    ...normalizedMethod,
    type: method.type || method.code,
    is_default: method.is_default ?? method.preferred
  };
});

export const getBankAccount = async () => normalizeEntityResponse(await apiClient.get('/protected/banks'));
export const getSmtpConfig = async () => normalizeEntityResponse(await apiClient.get('/protected/business/smtp'));

export const updateBusiness = async (payload) => normalizeEntityResponse(await apiClient.put('/protected/business', payload));

export const updateCategory = async (categoryId, payload) => normalizeEntityResponse(await apiClient.put(`/protected/categories/${categoryId}`, payload));

export const createCategory = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/categories', payload));

export const deleteCategory = async (categoryId) => normalizeEntityResponse(await apiClient.delete(`/protected/categories/${categoryId}`));

export const updatePaymentMethods = (payload) => apiClient.post('/protected/payment-methods', payload);

export const updateBankAccount = async (payload) => normalizeEntityResponse(await apiClient.put('/protected/banks', payload));

export const updateSmtpConfig = async (payload) => normalizeEntityResponse(await apiClient.put('/protected/business/smtp', payload));

export const testSmtpConfig = async (payload) => normalizeEntityResponse(await apiClient.post('/protected/business/smtp/test', payload));

export const getRolePermissions = async () => normalizeEntityResponse(await apiClient.get('/protected/business/role-permissions'));

export const updateRolePermissions = async (payload) => normalizeEntityResponse(await apiClient.put('/protected/business/role-permissions', payload));

export const getBusinessUsers = async () => normalizeListResponse(await apiClient.get('/protected/business/users'), 'users');

export const updateBusinessUserRole = async (userId: number, role: string) => normalizeEntityResponse(await apiClient.put(`/protected/business/users/${userId}`, { role }));
