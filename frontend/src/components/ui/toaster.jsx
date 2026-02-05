import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      expand
      position="bottom-left"
      toastOptions={{
        className: 'sonner-toast'
      }}
    />
  );
}
