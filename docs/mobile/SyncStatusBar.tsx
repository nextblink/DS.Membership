import { useEffect, useState } from 'react';
import { useSyncMeta, useOutboxCount } from '../db/hooks';

export default function SyncStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncMeta = useSyncMeta();
  const outboxCount = useOutboxCount() ?? 0;

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (isOnline && syncMeta?.status === 'idle' && outboxCount === 0) return null;

  return (
    <div className={`sync-bar ${isOnline ? (syncMeta?.status === 'syncing' ? 'syncing' : 'online') : 'offline'}`}>
      {!isOnline && <span>⚡ Offline — changes will sync when back online</span>}
      {isOnline && syncMeta?.status === 'syncing' && <span>↻ Syncing…</span>}
      {isOnline && syncMeta?.status === 'error' && <span>⚠ Sync error — will retry</span>}
      {isOnline && outboxCount > 0 && syncMeta?.status !== 'syncing' && (
        <span>↑ {outboxCount} pending {outboxCount === 1 ? 'item' : 'items'} to sync</span>
      )}
    </div>
  );
}
