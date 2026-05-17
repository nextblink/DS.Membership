import { db, Announcement, AnnouncementLike } from '../db/schema';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Delta Sync ───────────────────────────────────────────────────────────────

interface SyncDelta {
  announcements: Announcement[];
  announcementLikes: AnnouncementLike[];
  serverTime: string;
}

export async function syncFromServer(): Promise<void> {
  const meta = await db.syncMeta.get('main');
  const since = meta?.lastSyncedAt ?? '';

  await db.syncMeta.update('main', { status: 'syncing', lastAttemptAt: new Date().toISOString() });

  try {
    const res = await fetch(
      `${API_BASE}/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`,
      { headers: authHeaders() }
    );

    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

    const delta: SyncDelta = await res.json();

    await db.transaction('rw', [db.announcements, db.announcementLikes], async () => {
      if (delta.announcements.length) {
        // Preserve local isRead flag on upsert
        const existing = await db.announcements.bulkGet(delta.announcements.map(a => a.id));
        const merged = delta.announcements.map((a, i) => ({
          ...a,
          isRead: existing[i]?.isRead ?? false,
        }));
        await db.announcements.bulkPut(merged);
      }

      if (delta.announcementLikes.length) {
        await db.announcementLikes.bulkPut(
          delta.announcementLikes.map(l => ({ ...l, syncedAt: delta.serverTime }))
        );
      }
    });

    await db.syncMeta.update('main', { lastSyncedAt: delta.serverTime, status: 'idle' });
  } catch (err) {
    await db.syncMeta.update('main', { status: 'error' });
    throw err;
  }
}

// ─── Outbox Flush ─────────────────────────────────────────────────────────────

export async function flushOutbox(): Promise<void> {
  const entries = await db.outbox.orderBy('queuedAt').toArray();
  if (!entries.length) return;

  for (const entry of entries) {
    try {
      const { action } = entry;

      switch (action.type) {
        case 'LIKE_ANNOUNCEMENT': {
          const res = await fetch(`${API_BASE}/api/announcements/${action.announcementId}/like`, {
            method: 'POST',
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error(`Like failed: ${res.status}`);
          const memberId = sessionStorage.getItem('user_id') ?? '';
          await db.announcementLikes.update(
            `${action.announcementId}_${memberId}`,
            { syncedAt: new Date().toISOString() }
          );
          break;
        }

        case 'UNLIKE_ANNOUNCEMENT': {
          const res = await fetch(`${API_BASE}/api/announcements/${action.announcementId}/like`, {
            method: 'DELETE',
            headers: authHeaders(),
          });
          if (!res.ok) throw new Error(`Unlike failed: ${res.status}`);
          break;
        }

        case 'CREATE_ANNOUNCEMENT': {
          const res = await fetch(`${API_BASE}/api/announcements`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(action.payload),
          });
          if (!res.ok) throw new Error(`Create failed: ${res.status}`);
          const created: Announcement = await res.json();
          await db.announcements.put({ ...created, isRead: false });
          break;
        }
      }

      await db.outbox.delete(entry.id!);
    } catch (err) {
      await db.outbox.update(entry.id!, { attempts: (entry.attempts ?? 0) + 1 });
      console.warn('[Outbox] Failed', entry.id, err);
    }
  }
}

// ─── Full sync cycle ──────────────────────────────────────────────────────────

export async function runSync(): Promise<void> {
  await flushOutbox();
  await syncFromServer();
}

// ─── Online listener ──────────────────────────────────────────────────────────

let syncRegistered = false;

export function registerOnlineSync(): void {
  if (syncRegistered) return;
  syncRegistered = true;

  window.addEventListener('online', () => {
    console.log('[Sync] Back online — running sync');
    runSync().catch(console.error);
  });

  if (navigator.onLine) runSync().catch(console.error);
}
