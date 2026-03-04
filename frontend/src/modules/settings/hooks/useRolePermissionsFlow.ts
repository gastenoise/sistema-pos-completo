import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRolePermissions, updateRolePermissions } from '@/modules/settings/api';
import { canViewPermissionsTab } from '@/lib/authorizationGuards';
import { mapApiErrorMessage } from '@/api/errorMapping';

const DEFAULT_ROLE_PERMISSIONS = { admin: {}, cashier: {} };

export const CASH_REGISTER_PERMISSION_KEYS = [
  'cash_register.view',
  'cash_register.open',
  'cash_register.close',
];

export function useRolePermissionsFlow({
  businessId,
  can,
  role,
  allowOwnerOverride,
  onLoadError,
  onSaveError,
  onSaveSuccess,
}) {
  const [rolePermissions, setRolePermissions] = useState(DEFAULT_ROLE_PERMISSIONS);
  const [savingRolePermissions, setSavingRolePermissions] = useState(false);

  const canManageRolePermissions = useMemo(
    () => canViewPermissionsTab({ can, role, allowOwnerOverride }),
    [can, role, allowOwnerOverride],
  );

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!businessId || !canManageRolePermissions) {
        setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
        return;
      }

      try {
        const response = await getRolePermissions();
        const cashRegisterRows = response?.permissions?.cash_register ?? [];

        const nextPermissions = { admin: {}, cashier: {} };

        cashRegisterRows.forEach((item) => {
          const key = item?.permission_key;
          if (!CASH_REGISTER_PERMISSION_KEYS.includes(key)) return;
          nextPermissions.admin[key] = Boolean(item?.allowed_by_role?.admin);
          nextPermissions.cashier[key] = Boolean(item?.allowed_by_role?.cashier);
        });

        setRolePermissions(nextPermissions);
      } catch (error) {
        onLoadError?.(mapApiErrorMessage(error, 'No pudimos cargar la configuración de permisos.'));
      }
    };

    loadRolePermissions();
  }, [businessId, canManageRolePermissions, onLoadError]);

  const handleRolePermissionChange = useCallback((targetRole, permissionKey, checked) => {
    setRolePermissions((prev) => ({
      ...prev,
      [targetRole]: {
        ...(prev[targetRole] || {}),
        [permissionKey]: checked,
      },
    }));
  }, []);

  const saveRolePermissions = useCallback(async () => {
    if (!canManageRolePermissions) {
      return;
    }

    setSavingRolePermissions(true);

    try {
      const matrixRows = ['admin', 'cashier'].flatMap((targetRole) => (
        CASH_REGISTER_PERMISSION_KEYS.map((permissionKey) => ({
          role: targetRole,
          permission_key: permissionKey,
          allowed: Boolean(rolePermissions?.[targetRole]?.[permissionKey]),
        }))
      ));

      await updateRolePermissions({ role_permissions: matrixRows });
      onSaveSuccess?.();
    } catch (error) {
      onSaveError?.(mapApiErrorMessage(error, 'No pudimos guardar los permisos.'));
    } finally {
      setSavingRolePermissions(false);
    }
  }, [canManageRolePermissions, onSaveError, onSaveSuccess, rolePermissions]);

  return {
    canManageRolePermissions,
    rolePermissions,
    savingRolePermissions,
    handleRolePermissionChange,
    saveRolePermissions,
  };
}
