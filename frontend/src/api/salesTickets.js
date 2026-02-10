import { getToken } from './auth';
import { apiClient } from './client';

const BUSINESS_STORAGE_KEY = 'pos_current_business';

const getBusinessId = () => {
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

const buildApiUrl = (path) => {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (!baseUrl) {
    return path;
  }
  return `${baseUrl}${path}`;
};

const resolveResponseData = (response) => response?.data ?? response;

const resolveErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload?.message || response.statusText || 'Request failed';
  } catch (error) {
    return response.statusText || 'Request failed';
  }
};

export const downloadSaleTicketPdf = async (saleId) => {
  const token = getToken();
  const businessId = getBusinessId();

  const response = await fetch(buildApiUrl(`/protected/sales/${saleId}/ticket/pdf?download=true`), {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(businessId ? { 'X-Business-Id': businessId } : {}),
    },
  });

  if (!response.ok) {
    const error = new Error(await resolveErrorMessage(response));
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"\n]+)/i);
  const fileName = decodeURIComponent((match?.[1] || `ticket-sale-${saleId}.pdf`).replace(/"/g, '').trim());

  return { blob, fileName };
};

export const sendSaleTicketEmail = async (saleId, payload) => {
  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/email`, payload);
  return resolveResponseData(response);
};

export const getSaleTicketWhatsappShare = async (saleId) => {
  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp`, {});
  return resolveResponseData(response);
};
