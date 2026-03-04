export const SETTINGS_PERMISSIONS_MANAGE_PERMISSION = 'settings.permissions.manage';

export const ROUTE_PERMISSIONS = {
  CashRegister: 'cash_register.view',
  Settings: SETTINGS_PERMISSIONS_MANAGE_PERMISSION,
};

/**
 * Owner override must be opt-in from call sites.
 * Use only when there is an explicit business rule that owners are superusers.
 */
export const canViewPermissionsTab = ({ can, role, allowOwnerOverride = false }) => {
  if (allowOwnerOverride && role === 'owner') {
    return true;
  }

  return can(SETTINGS_PERMISSIONS_MANAGE_PERMISSION);
};

export const canAccessRoute = (path, can) => {
  const requiredPermission = ROUTE_PERMISSIONS[path];
  return !requiredPermission || can(requiredPermission);
};
