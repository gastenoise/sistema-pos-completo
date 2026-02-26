export const mapApiErrorMessage = (error, fallbackMessage) => {
  if (typeof error?.data === 'string' && error.data.trim()) {
    return error.data;
  }

  const payloadMessage = error?.data?.message || error?.data?.error;
  if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
    return payloadMessage;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export const mapApiError = (error, fallbackMessage) => ({
  message: mapApiErrorMessage(error, fallbackMessage),
  status: error?.status,
  data: error?.data ?? null,
});
