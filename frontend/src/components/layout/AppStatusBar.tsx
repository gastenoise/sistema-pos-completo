import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Clock, User, Shield, Wallet } from 'lucide-react';
import { StatusBarContext } from '@/routes/routeMeta';
import { getRoleLabel } from '@/lib/roleLabels';

interface AppStatusBarProps {
  user?: any;
  role?: string | null;
  can?: (permission: string) => boolean;
  cashStatus?: any;
  context?: StatusBarContext;
  visible?: boolean;
}

export default function AppStatusBar({
  user,
  role,
  can,
  cashStatus,
  context = 'default',
  visible = true
}: AppStatusBarProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const userDisplayName = user?.name || user?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const roleDisplayName = getRoleLabel(role);

  const canViewCash = can ? can('view_cash_register') : false;
  const isCashOpen = cashStatus?.status === 'open';

  if (!visible) return null;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 h-[var(--status-bar-height)] border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 text-[10px] sm:text-xs text-slate-500">
        {/* Left: Operational Info */}
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-1.5 shrink-0">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{userDisplayName}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Shield className="h-3 w-3" />
            <span>{roleDisplayName}</span>
          </div>

          {canViewCash && cashStatus && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Wallet className="h-3 w-3" />
              <span className={cn(
                "font-medium",
                isCashOpen ? "text-emerald-600" : "text-amber-600"
              )}>
                Caja {isCashOpen ? 'Abierta' : 'Cerrada'}
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatTime(now)}</span>
          </div>
        </div>

        {/* Right: Credits */}
        <div className="flex items-center gap-1 shrink-0 ml-4">
          <span>Desarrollado por</span>
          <a
            href="https://gastonurgorri.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            Gastón Urgorri
          </a>
        </div>
      </div>
    </footer>
  );
}
