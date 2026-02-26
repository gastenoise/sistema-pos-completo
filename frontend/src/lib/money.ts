export const toCents = (amount) => {
  const normalized = Number(amount) || 0;
  return Math.round(normalized * 100);
};

export const fromCents = (cents) => (Number(cents) || 0) / 100;

export const sumToCents = (amounts = []) => amounts.reduce((acc, amount) => acc + toCents(amount), 0);
