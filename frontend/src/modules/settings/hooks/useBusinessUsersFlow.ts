import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessUsers, updateBusinessUserRole } from '@/modules/settings/api';
import { toast } from 'sonner';
import { mapApiErrorMessage } from '@/api/errorMapping';

export function useBusinessUsersFlow(businessId: number | undefined) {
  const queryClient = useQueryClient();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['business-users', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      return getBusinessUsers();
    },
    enabled: !!businessId,
  });

  const handleUpdateRole = useCallback(async (userId: number, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      await updateBusinessUserRole(userId, newRole);
      toast.success('Rol de usuario actualizado correctamente.');
      queryClient.invalidateQueries({ queryKey: ['business-users', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business-permissions', businessId] });
    } catch (err) {
      toast.error(mapApiErrorMessage(err, 'No pudimos actualizar el rol del usuario.'));
    } finally {
      setUpdatingUserId(null);
    }
  }, [businessId, queryClient]);

  return {
    users,
    isLoading,
    error,
    updatingUserId,
    handleUpdateRole,
  };
}
