import React from 'react';
import { Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useCart } from './CartContext';

export default function NetworkIndicator({ onSyncQueue }) {
  const { isOnline, offlineQueue } = useCart();
  const [syncing, setSyncing] = React.useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSyncQueue?.();
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && offlineQueue.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${
      isOnline ? 'bg-amber-100 border-amber-300' : 'bg-red-100 border-red-300'
    } border rounded-lg p-3 shadow-lg`}>
      <div className="flex items-center gap-3">
        {isOnline ? (
          <Wifi className="w-5 h-5 text-amber-600" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-600" />
        )}
        
        <div>
          <p className={`text-sm font-medium ${isOnline ? 'text-amber-900' : 'text-red-900'}`}>
            {isOnline ? 'Online' : 'Offline Mode'}
          </p>
          {offlineQueue.length > 0 && (
            <p className="text-xs text-slate-600">
              {offlineQueue.length} sale{offlineQueue.length !== 1 ? 's' : ''} pending sync
            </p>
          )}
        </div>

        {isOnline && offlineQueue.length > 0 && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="ml-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}