import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const TICKET_WIDTH_MM = 80;
const HORIZONTAL_PADDING_MM = 1;
const IMAGE_SCALE = 3;

const createPrintableWrapper = (sourceNode) => {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = `${TICKET_WIDTH_MM}mm`;
  wrapper.style.padding = `${HORIZONTAL_PADDING_MM}mm`;
  wrapper.style.background = '#ffffff';

  const clone = sourceNode.cloneNode(true);
  clone.style.width = '100%';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.background = '#ffffff';

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  return wrapper;
};

const buildTicketPdfFromNode = async ({ ticketNode }) => {
  if (!ticketNode) {
    throw new Error('No hay contenido de ticket para exportar.');
  }

  const printableWrapper = createPrintableWrapper(ticketNode);

  try {
    const canvas = await html2canvas(printableWrapper, {
      scale: IMAGE_SCALE,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: printableWrapper.scrollWidth,
      height: printableWrapper.scrollHeight,
      windowWidth: printableWrapper.scrollWidth,
      windowHeight: printableWrapper.scrollHeight,
    });

    const imageData = canvas.toDataURL('image/png');
    const contentWidthMm = TICKET_WIDTH_MM - HORIZONTAL_PADDING_MM * 2;
    const contentHeightMm = (canvas.height * contentWidthMm) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [TICKET_WIDTH_MM, contentHeightMm + HORIZONTAL_PADDING_MM * 2],
      compress: true,
    });

    pdf.addImage(imageData, 'PNG', HORIZONTAL_PADDING_MM, HORIZONTAL_PADDING_MM, contentWidthMm, contentHeightMm, undefined, 'FAST');

    return pdf;
  } finally {
    printableWrapper.remove();
  }
};

export const generateTicketFileName = (saleId) => `ticket-venta-${saleId}.pdf`;

export const generateTicketPdfBlobFromNode = async ({ saleId, ticketNode }) => {
  if (!saleId) {
    throw new Error('No se encontró el id de la venta para generar el PDF.');
  }

  const pdf = await buildTicketPdfFromNode({ ticketNode });
  return pdf.output('blob');
};

export const downloadTicketPdfFromNode = async ({ saleId, ticketNode }) => {
  if (!saleId) {
    throw new Error('No se encontró el id de la venta para generar el PDF.');
  }

  const pdf = await buildTicketPdfFromNode({ ticketNode });
  pdf.save(generateTicketFileName(saleId));
};
