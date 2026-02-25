import { apiClient } from './client';
import { normalizeEntityResponse } from '@/lib/normalizeResponse';

export const getSaleTicket = async (saleId) => normalizeEntityResponse(await apiClient.get(`/protected/sales/${saleId}/ticket`));

export const sendSaleTicketEmail = async (saleId, formData) => normalizeEntityResponse(
  await apiClient.post(`/protected/sales/${saleId}/ticket/email`, formData)
);

export const uploadSaleTicketWhatsappFile = async (saleId, pdfFile) => {
  const formData = new FormData();
  formData.append('pdf_file', pdfFile);

  return normalizeEntityResponse(await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp/file`, formData));
};

export const getSaleTicketWhatsappShare = async (saleId, payload = {}) => normalizeEntityResponse(
  await apiClient.post(`/protected/sales/${saleId}/ticket/share/whatsapp`, payload)
);

export const getSaleTicketEmailStatus = async (saleId, requestId) => normalizeEntityResponse(
  await apiClient.get(`/protected/sales/${saleId}/ticket/email-status/${requestId}`)
);
