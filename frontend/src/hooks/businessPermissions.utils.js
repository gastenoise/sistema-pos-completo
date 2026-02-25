export const EMPTY_PERMISSIONS = Object.freeze({});

export const normalizeBusinessPermissionsPayload = (response) => {
  const payload = response?.data ?? response;

  return {
    role: payload?.role ?? null,
    permissions: payload?.permissions ?? EMPTY_PERMISSIONS,
  };
};

export const createPermissionChecker = (permissions) => (permissionKey) => Boolean(permissions?.[permissionKey]);
