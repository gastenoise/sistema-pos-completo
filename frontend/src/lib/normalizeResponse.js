export const normalizeListResponse = (response, fallbackKey) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (!response || typeof response !== 'object') {
    return [];
  }

  const root = response?.data ?? response;
  const candidate = root?.[fallbackKey]
    ?? root?.data
    ?? root?.items
    ?? root?.results
    ?? response?.[fallbackKey]
    ?? response?.items
    ?? response?.results;

  if (Array.isArray(candidate)) {
    return candidate;
  }
  if (Array.isArray(candidate?.data)) {
    return candidate.data;
  }
  if (Array.isArray(candidate?.items)) {
    return candidate.items;
  }
  if (Array.isArray(candidate?.results)) {
    return candidate.results;
  }

  return [];
};

export const normalizeEntityResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return response;
  }
  return response?.data ?? response?.item ?? response;
};
