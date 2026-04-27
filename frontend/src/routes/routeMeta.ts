export type StatusBarContext = 'pos' | 'cash_register' | 'reports' | 'settings' | 'profile' | 'default';
export type ContentWidth = 'default' | 'wide' | 'full';

export interface RouteMeta {
  label: string;
  showStatusBar: boolean;
  statusBarContext: StatusBarContext;
  contentWidth: ContentWidth;
  useShell: boolean;
}

export const ROUTE_METADATA: Record<string, RouteMeta> = {
  Home: {
    label: 'Inicio',
    showStatusBar: true,
    statusBarContext: 'default',
    contentWidth: 'wide',
    useShell: true,
  },
  POS: {
    label: 'POS',
    showStatusBar: true,
    statusBarContext: 'pos',
    contentWidth: 'full',
    useShell: true,
  },
  CashRegister: {
    label: 'Caja',
    showStatusBar: true,
    statusBarContext: 'cash_register',
    contentWidth: 'default',
    useShell: true,
  },
  Items: {
    label: 'Items',
    showStatusBar: true,
    statusBarContext: 'default',
    contentWidth: 'wide',
    useShell: true,
  },
  Reports: {
    label: 'Reportes',
    showStatusBar: true,
    statusBarContext: 'reports',
    contentWidth: 'wide',
    useShell: true,
  },
  Settings: {
    label: 'Ajustes',
    showStatusBar: true,
    statusBarContext: 'settings',
    contentWidth: 'default',
    useShell: true,
  },
  Profile: {
    label: 'Perfil',
    showStatusBar: true,
    statusBarContext: 'profile',
    contentWidth: 'default',
    useShell: true,
  },
  BusinessSelect: {
    label: 'Seleccionar Negocio',
    showStatusBar: false,
    statusBarContext: 'default',
    contentWidth: 'default',
    useShell: false,
  },
  Login: {
    label: 'Iniciar Sesión',
    showStatusBar: true,
    statusBarContext: 'default',
    contentWidth: 'default',
    useShell: false,
  },
};

export const DEFAULT_META: RouteMeta = {
  label: '',
  showStatusBar: true,
  statusBarContext: 'default',
  contentWidth: 'wide',
  useShell: true,
};

export function getRouteMeta(routeKey: string): RouteMeta {
  return ROUTE_METADATA[routeKey] || { ...DEFAULT_META, label: routeKey };
}
