import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getRolePermissions, updateRolePermissions } from '@/modules/settings/api';
import { canViewPermissionsTab } from '@/lib/authorizationGuards';
import { mapApiErrorMessage } from '@/api/errorMapping';

const DEFAULT_ROLE_PERMISSIONS = { admin: {}, cashier: {} };

export const CASH_REGISTER_PERMISSION_KEYS = [
  'cash_register.view',
  'cash_register.open',
  'cash_register.close',
];

export const SALES_PERMISSION_KEYS = [
  'sales.void',
];

export const ROLE_PERMISSIONS_MATRIX_KEYS = [
  ...CASH_REGISTER_PERMISSION_KEYS,
  ...SALES_PERMISSION_KEYS,
  'settings.permissions.manage',
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
  const loadRequestIdRef = useRef(0);
  const handlersRef = useRef({ onLoadError, onSaveError, onSaveSuccess });

  useEffect(() => {
    handlersRef.current = { onLoadError, onSaveError, onSaveSuccess };
  }, [onLoadError, onSaveError, onSaveSuccess]);

  const canManageRolePermissions = useMemo(
    () => canViewPermissionsTab({ can, role, allowOwnerOverride }),
    [can, role, allowOwnerOverride],
  );

  useEffect(() => {
    loadRequestIdRef.current += 1;
    const requestId = loadRequestIdRef.current;

    const loadRolePermissions = async () => {
      if (!businessId || !canManageRolePermissions) {
        setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
        return;
      }

      try {
        const response = await getRolePermissions();
        if (requestId !== loadRequestIdRef.current) return;
        const cashRegisterRows = response?.permissions?.cash_register ?? [];
        const salesRows = response?.permissions?.sales ?? [];

        const nextPermissions = { admin: {}, cashier: {} };

        cashRegisterRows.forEach((item) => {
          const key = item?.permission_key;
          if (!CASH_REGISTER_PERMISSION_KEYS.includes(key)) return;
          nextPermissions.admin[key] = Boolean(item?.allowed_by_role?.admin);
          nextPermissions.cashier[key] = Boolean(item?.allowed_by_role?.cashier);
        });

        salesRows.forEach((item) => {
          const key = item?.permission_key;
          if (!SALES_PERMISSION_KEYS.includes(key)) return;
          nextPermissions.admin[key] = Boolean(item?.allowed_by_role?.admin);
          nextPermissions.cashier[key] = Boolean(item?.allowed_by_role?.cashier);
        });

        setRolePermissions(nextPermissions);
      } catch (error) {
        if (requestId !== loadRequestIdRef.current) return;
        handlersRef.current.onLoadError?.(mapApiErrorMessage(error, 'No pudimos cargar la configuración de permisos.'));
      }
    };

    loadRolePermissions();

    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [businessId, canManageRolePermissions]);

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
        ROLE_PERMISSIONS_MATRIX_KEYS.map((permissionKey) => ({
          role: targetRole,
          permission_key: permissionKey,
          allowed: Boolean(rolePermissions?.[targetRole]?.[permissionKey]),
        }))
      ));

      await updateRolePermissions({ role_permissions: matrixRows });
      handlersRef.current.onSaveSuccess?.();
    } catch (error) {
      handlersRef.current.onSaveError?.(mapApiErrorMessage(error, 'No pudimos guardar los permisos.'));
    } finally {
      setSavingRolePermissions(false);
    }
  }, [canManageRolePermissions, rolePermissions]);

  return {
    canManageRolePermissions,
    rolePermissions,
    savingRolePermissions,
    handleRolePermissionChange,
    saveRolePermissions,
  };
}
