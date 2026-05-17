import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './schema.js';
import { auth } from '../framework/auth.js';

export function useAnnouncements() {
  return useLiveQuery(() => db.announcements.orderBy('createdDate').reverse().toArray(), []);
}

export function useAnnouncement(id) {
  return useLiveQuery(() => db.announcements.get(id), [id]);
}

export function useUnreadCount() {
  return useLiveQuery(async () => {
    const meta = await db.syncMeta.get('lastSeen');
    if (!meta) return 0;
    const lastSeen = parseInt(meta.value, 10);
    return db.announcements.where('createdDate').above(new Date(lastSeen).toISOString()).count();
  }, []);
}

export function useAnnouncementLike(announcementId) {
  const memberId = auth.getMemberId();
  return useLiveQuery(
    () => db.announcementLikes.get([announcementId, memberId]),
    [announcementId, memberId]
  );
}

export function useSyncMeta() {
  return useLiveQuery(() => db.syncMeta.get('lastSync'), []);
}

export function useOutboxCount() {
  return useLiveQuery(() => db.outbox.where('status').equals('pending').count(), []);
}

export async function toggleLike(announcement) {
  const memberId = auth.getMemberId();
  const key = [announcement.id, memberId];
  const existing = await db.announcementLikes.get(key);

  if (existing) {
    await db.announcementLikes.delete(key);
    await db.announcements.update(announcement.id, { likedByMe: false, likeCount: Math.max(0, announcement.likeCount - 1) });
    await db.outbox.add({ action: 'UNLIKE_ANNOUNCEMENT', payload: { id: announcement.id }, status: 'pending', createdAt: Date.now() });
  } else {
    await db.announcementLikes.put({ announcementId: announcement.id, memberId });
    await db.announcements.update(announcement.id, { likedByMe: true, likeCount: announcement.likeCount + 1 });
    await db.outbox.add({ action: 'LIKE_ANNOUNCEMENT', payload: { id: announcement.id }, status: 'pending', createdAt: Date.now() });
  }
}
