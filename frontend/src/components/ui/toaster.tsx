import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      expand
      position="bottom-left"
      containerStyle={{
        bottom: 'var(--status-bar-height)',
      }}
      toastOptions={{
        className: 'sonner-toast'
      }}
    />
  );
}
