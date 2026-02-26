import { normalizeEntityResponse, normalizeListResponse } from '../../../lib/normalizeResponse';
import { mapCatalogIsActive, withCatalogIsActive } from '../../../lib/catalogNaming';

export const normalizeSettingsCategories = (response) => mapCatalogIsActive(normalizeListResponse(response, 'categories'));

export const normalizeSettingsPaymentMethods = (response) => normalizeListResponse(response, 'payment_methods').map((method) => {
  const normalizedMethod = withCatalogIsActive(method);
  return {
    ...normalizedMethod,
    type: method.type || method.code,
    is_default: method.is_default ?? method.preferred,
  };
});

export const applyCategoryCacheUpdate = ({ queryClient, businessId, response }) => {
  const list = normalizeSettingsCategories(response);
  if (list.length > 0) {
    queryClient.setQueryData(['categories', businessId], list);
    return true;
  }

  const entity = normalizeEntityResponse(response);
  if (!entity?.id) {
    return false;
  }

  const normalizedEntity = withCatalogIsActive(entity);
  queryClient.setQueryData(['categories', businessId], (prev = []) => {
    const safePrev = Array.isArray(prev) ? prev : [];
    const exists = safePrev.find((category) => category.id === normalizedEntity.id);

    if (exists) {
      return safePrev.map((category) => (category.id === normalizedEntity.id ? { ...category, ...normalizedEntity } : category));
    }

    return [normalizedEntity, ...safePrev];
  });

  return true;
};

export const settingsInvalidationKeys = (businessId) => ([
  ['categories', businessId],
  ['paymentMethods', businessId],
  ['bankAccount', businessId],
  ['smtpConfig', businessId],
  ['rolePermissions', businessId],
]);
