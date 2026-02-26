import { apiClient } from '@/api/client';
import { normalizeEntityResponse, normalizeListResponse } from '@/lib/normalizeResponse';

export const getBusinesses = async () => normalizeListResponse(await apiClient.get('/protected/businesses'), 'businesses');

export const selectBusiness = (businessId) => apiClient.post('/protected/businesses/select', { business_id: businessId });

export const getSmtpStatus = async () => normalizeEntityResponse(await apiClient.get('/protected/business/smtp/status'));
