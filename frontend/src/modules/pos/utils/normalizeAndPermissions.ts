export const normalizePosCatalogItems = (items = []) =>
  items
    .map((item) => ({
      ...item,
      source: item?.source ?? 'local',
      is_active: item?.is_active !== false,
    }))
    .filter((item) => item.is_active);

export const canOperatePos = (permissions = {}) =>
  permissions?.['sales.view'] === true || permissions?.['sales.manage'] === true;
