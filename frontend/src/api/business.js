import { apiClient } from '@/api/client';

export const getSmtpStatus = async () => {
  const response = await apiClient.get('/protected/business/smtp/status');
  return response?.data || response;
};

export const getIconCatalog = async () => {
  const response = await apiClient.get('/protected/info/icons');
  return response?.data || response || {};
};
