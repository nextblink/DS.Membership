import React, { useEffect, useState } from 'react';
import { useSyncMeta, useOutboxCount } from '../db/hooks.js';

export default function SyncStatusBar() {
  const [online, setOnline] = useState(navigator.onLine);
  const syncMeta = useSyncMeta();
  const outboxCount = useOutboxCount() ?? 0;

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  if (online && outboxCount === 0) return null;

  const message = !online
    ? 'Offline — changes will sync when connected'
    : `Syncing ${outboxCount} pending change${outboxCount !== 1 ? 's' : ''}…`;

  return (
    <div className="px-4 py-2 text-xs text-center"
      style={{ backgroundColor: online ? 'var(--color-accent)' : '#b71c1c', color: online ? 'var(--color-accent-text)' : '#fff' }}>
      {message}
    </div>
  );
}
