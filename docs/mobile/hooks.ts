import { useLiveQuery } from 'dexie-react-hooks';
import { db, OutboxAction } from './schema';

const USER_ID = () => sessionStorage.getItem('user_id') ?? '';

// ─── Announcements ────────────────────────────────────────────────────────────

export function useAnnouncements() {
  return useLiveQuery(
    () => db.announcements.orderBy('createdAt').reverse().toArray(),
    [],
    []
  );
}

export function useAnnouncement(id: string) {
  return useLiveQuery(() => db.announcements.get(id), [id]);
}

export function useUnreadCount() {
  return useLiveQuery(
    () => db.announcements.filter(a => !a.isRead).count(),
    [],
    0
  );
}

export async function markAnnouncementRead(id: string) {
  await db.announcements.update(id, { isRead: true });
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export function useAnnouncementLike(announcementId: string) {
  const memberId = USER_ID();
  return useLiveQuery(
    () => db.announcementLikes.get(`${announcementId}_${memberId}`),
    [announcementId, memberId]
  );
}

export async function toggleLike(announcementId: string) {
  const memberId = USER_ID();
  const likeId = `${announcementId}_${memberId}`;
  const existing = await db.announcementLikes.get(likeId);
  const now = new Date().toISOString();

  if (existing) {
    // Unlike — remove locally and queue
    await db.announcementLikes.delete(likeId);
    await db.announcements.where('id').equals(announcementId).modify(a => {
      a.likeCount = Math.max(0, a.likeCount - 1);
    });
    const action: OutboxAction = { type: 'UNLIKE_ANNOUNCEMENT', announcementId };
    await db.outbox.add({ action, queuedAt: now, attempts: 0 });
  } else {
    // Like — write locally and queue
    await db.announcementLikes.put({ id: likeId, announcementId, memberId, createdAt: now, syncedAt: null });
    await db.announcements.where('id').equals(announcementId).modify(a => {
      a.likeCount = a.likeCount + 1;
    });
    const action: OutboxAction = { type: 'LIKE_ANNOUNCEMENT', announcementId };
    await db.outbox.add({ action, queuedAt: now, attempts: 0 });
  }
}

// ─── Sync status ──────────────────────────────────────────────────────────────

export function useSyncMeta() {
  return useLiveQuery(() => db.syncMeta.get('main'), [], null);
}

export function useOutboxCount() {
  return useLiveQuery(() => db.outbox.count(), [], 0);
}

// ─── Compose ─────────────────────────────────────────────────────────────────

export async function queueAnnouncement(
  payload: OutboxAction & { type: 'CREATE_ANNOUNCEMENT' }
) {
  await db.outbox.add({ action: payload, queuedAt: new Date().toISOString(), attempts: 0 });
}
