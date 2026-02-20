import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function GlobalLoadingOverlay() {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const location = useLocation();

  const isLoginRoute = location.pathname === '/login';
  const hasNetworkActivity = (isFetching + isMutating) > 0;

  if (isLoginRoute || !hasNetworkActivity) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70]">
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
        <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
        <span className="text-sm font-medium text-slate-700">Cargando…</span>
      </div>
    </div>
  );
}
