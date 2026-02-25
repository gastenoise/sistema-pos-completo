export const buildTopNavItems = (can, createUrl = (page) => `/${page}`) => {
  const canViewCashRegister = can('cash_register.view');

  return [
    { name: 'POS', href: createUrl('POS'), iconKey: 'ShoppingCart' },
    { name: 'Items', href: createUrl('Items'), iconKey: 'Package' },
    { name: 'Reportes', href: createUrl('Reports'), iconKey: 'BarChart3' },
    ...(canViewCashRegister ? [{ name: 'Caja', href: createUrl('CashRegister'), iconKey: 'CreditCard' }] : []),
    { name: 'Ajustes', href: createUrl('Settings'), iconKey: 'Settings', requiredPermission: 'settings.permissions.manage' },
  ].filter((item) => !item.requiredPermission || can(item.requiredPermission));
};
