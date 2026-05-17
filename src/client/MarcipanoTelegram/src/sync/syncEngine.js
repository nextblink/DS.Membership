import { api } from '../framework/api.js';
import { auth } from '../framework/auth.js';
import { db } from '../db/schema.js';

let syncing = false;

export async function sync() {
  if (syncing || !auth.isAuthenticated()) return;
  syncing = true;
  try {
    const meta = await db.syncMeta.get('lastSync');
    const since = meta?.value ?? null;

    const data = await api.get(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`);

    await db.transaction('rw', [db.announcements, db.announcementLikes, db.syncMeta], async () => {
      for (const ann of data.announcements) {
        await db.announcements.put(ann);
      }
      for (const like of data.announcementLikes) {
        await db.announcementLikes.put(like);
      }
      await db.syncMeta.put({ key: 'lastSync', value: data.serverTime });
    });

    await flushOutbox();
  } catch (err) {
    console.warn('Sync failed:', err);
  } finally {
    syncing = false;
  }
}

async function flushOutbox() {
  const pending = await db.outbox.where('status').equals('pending').toArray();
  for (const item of pending) {
    try {
      if (item.action === 'LIKE_ANNOUNCEMENT') {
        await api.post(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'UNLIKE_ANNOUNCEMENT') {
        await api.delete(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'CREATE_ANNOUNCEMENT') {
        await api.post('/api/announcements', item.payload);
      }
      await db.outbox.delete(item.id);
    } catch {
      await db.outbox.update(item.id, { status: 'failed' });
    }
  }
}

export function startSyncLoop(intervalMs = 30_000) {
  sync();
  return setInterval(() => {
    if (navigator.onLine) sync();
  }, intervalMs);
}
