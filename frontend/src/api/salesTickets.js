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

export const uploadSaleTicketWhatsappFile = async (saleId, pdfFile) => {
  const formData = new FormData();
  formData.append('pdf_file', pdfFile);

  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp/file`, formData);
  return resolveResponseData(response);
};

export const getSaleTicketWhatsappShare = async (saleId, payload = {}) => {
  const response = await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp`, payload);
  return resolveResponseData(response);
};
