export const ROUTE_PERMISSIONS = {
  CashRegister: 'cash_register.view',
  Settings: 'settings.permissions.manage',
};

export const canAccessRoute = (path, can) => {
  const requiredPermission = ROUTE_PERMISSIONS[path];
  return !requiredPermission || can(requiredPermission);
};

export const canViewPermissionsTab = (role) => ['owner', 'admin'].includes(role);
