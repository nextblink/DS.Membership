import Dexie from 'dexie';

export const db = new Dexie('MarcipanoTelegram');

db.version(1).stores({
  announcements: 'id, createdDate, authorId, targetCommitteeId, targetLevel',
  announcementLikes: '[announcementId+memberId], announcementId, memberId',
  outbox: '++id, action, status, createdAt',
  syncMeta: 'key',
});

db.version(2).stores({
  announcements: 'id, createdDate, authorId, targetCommitteeId, targetLevel, targetEventId',
  announcementLikes: '[announcementId+memberId], announcementId, memberId',
  outbox: '++id, action, status, createdAt',
  syncMeta: 'key',
  events: 'id, committeeId, isActive',
  eventMemberships: 'eventId',
});
