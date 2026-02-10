export const withCatalogIsActive = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  if (Object.prototype.hasOwnProperty.call(entity, 'is_active')) {
    return { ...entity, is_active: entity.is_active };
  }

  if (Object.prototype.hasOwnProperty.call(entity, 'active')) {
    return { ...entity, is_active: entity.active };
  }

  return { ...entity, is_active: true };
};

export const mapCatalogIsActive = (entities = []) => entities.map(withCatalogIsActive);

