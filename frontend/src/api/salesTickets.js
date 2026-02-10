import { apiClient } from './client';

const resolveResponseData = (response) => response?.data ?? response;

export const getSaleTicket = async (saleId) => {
  const response = await apiClient.get(`/protected/sales/${saleId}/ticket`);
  return resolveResponseData(response);
};

export const sendSaleTicketEmail = async (saleId, payload) => {
  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/email`, payload);
  return resolveResponseData(response);
};

export const getSaleTicketWhatsappShare = async (saleId) => {
  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp`, {});
  return resolveResponseData(response);
};
