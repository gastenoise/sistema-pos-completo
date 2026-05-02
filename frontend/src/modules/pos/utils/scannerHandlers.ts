import { getPosItemByBarcode } from '../api';

export const findExactItemMatch = (code: string, list: any[] = []) => {
  const normalizedCode = String(code ?? '').trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }

  const matches = list.filter((item) => {
    const barcode = String(item?.barcode ?? '').trim().toLowerCase();
    const sku = String(item?.sku ?? '').trim().toLowerCase();
    return barcode === normalizedCode || sku === normalizedCode;
  });

  if (matches.length !== 1) {
    return null;
  }

  return matches[0];
};

export const handlePosScanComplete = async ({
  rawCode,
  hasPaymentDialogOpen,
  items,
  addScannedItem,
  onNoMatchFound,
}: {
  rawCode: string;
  hasPaymentDialogOpen: boolean;
  items: any[];
  addScannedItem: (code: string, item: any) => boolean;
  onNoMatchFound?: (code: string, item?: any) => void;
}) => {
  if (hasPaymentDialogOpen) {
    return;
  }

  const code = String(rawCode ?? '').trim();
  if (!code) {
    return;
  }

  const localMatch = findExactItemMatch(code, items);

  if (localMatch) {
    addScannedItem(code, localMatch);
    return;
  }

  // If not in current list, try an exact lookup via API
  try {
    const apiItem = await getPosItemByBarcode(code);
    if (apiItem) {
      addScannedItem(code, apiItem);
    } else {
      onNoMatchFound?.(code);
    }
  } catch (error) {
    onNoMatchFound?.(code);
  }
};

export const handleItemsScanComplete = async ({
  rawCode,
  items,
  onMatchFound,
  onNoMatchFound,
}: {
  rawCode: string;
  items: any[];
  onMatchFound: (item: any) => void;
  onNoMatchFound: (code: string) => void;
}) => {
  const code = String(rawCode ?? '').trim();
  if (!code) {
    return;
  }

  const localMatch = findExactItemMatch(code, items);
  if (localMatch) {
    onMatchFound(localMatch);
    return;
  }

  try {
    const apiItem = await getPosItemByBarcode(code);
    if (apiItem) {
      onMatchFound(apiItem);
    } else {
      onNoMatchFound(code);
    }
  } catch (error) {
    onNoMatchFound(code);
  }
};
