import { cn } from '@/lib/utils';

type ScanProgressOverlayProps = {
  open: boolean;
  buffer: string;
  status?: 'scanning' | 'completed';
};

export default function ScanProgressOverlay({
  open,
  buffer,
  status = 'scanning',
}: ScanProgressOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(1rem+var(--status-bar-height))] right-4 z-[70]">
      <div
        className={cn(
          'w-[280px] rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur transition-all',
          status === 'completed' ? 'border-emerald-400/60' : 'border-border'
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-medium text-muted-foreground">
          {status === 'completed' ? 'Código escaneado' : 'Escaneando código...'}
        </p>
        <p className="mt-1 truncate font-mono text-sm tracking-wide text-foreground">
          {status === 'completed' ? buffer : (buffer || '...')}
        </p>
      </div>
    </div>
  );
}
