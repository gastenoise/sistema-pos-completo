export const ROLE_LABELS: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  cashier: 'Cajero',
};

/**
 * Returns the human-readable label for a given role key.
 * If the role is not found in the mapper, it returns the capitalized role key as fallback.
 */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return '...';
  const normalizedRole = role.toLowerCase();
  return ROLE_LABELS[normalizedRole] || (role.charAt(0).toUpperCase() + role.slice(1));
}
