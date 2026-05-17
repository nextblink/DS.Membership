import Dexie, { Table } from 'dexie';

// ─── Domain Models ────────────────────────────────────────────────────────────

export type Level = 'national' | 'regional' | 'local';
export type Role = string;

export interface Attachment {
  id: string;
  announcementId: string;
  fileName: string;
  fileUrl: string;       // absolute URL served from backend static files
  fileSize: number;      // bytes
  mimeType: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  targetLevel: Level | null;        // null = all levels
  targetRole: Role | null;          // null = all roles
  targetTerritoryId: string | null; // null = all territories
  createdAt: string;                // ISO timestamp
  updatedAt: string;
  isRead: boolean;                  // local-only flag
  likeCount: number;                // total likes from server
  attachments: Attachment[];        // embedded — no separate table needed
}

export interface AnnouncementLike {
  id: string;             // `${announcementId}_${memberId}`
  announcementId: string;
  memberId: string;
  createdAt: string;
  syncedAt: string | null; // null = pending sync
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

export type OutboxAction =
  | { type: 'LIKE_ANNOUNCEMENT';   announcementId: string }
  | { type: 'UNLIKE_ANNOUNCEMENT'; announcementId: string }
  | { type: 'CREATE_ANNOUNCEMENT'; payload: CreateAnnouncementPayload };

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  targetLevel: Level | null;
  targetRole: Role | null;
  targetTerritoryId: string | null;
  attachmentIds: string[]; // uploaded separately before submit
}

export interface OutboxEntry {
  id?: number;
  action: OutboxAction;
  queuedAt: string;
  attempts: number;
}

// ─── Sync metadata ────────────────────────────────────────────────────────────

export interface SyncMeta {
  key: string;
  lastSyncedAt: string | null;
  lastAttemptAt: string | null;
  status: 'idle' | 'syncing' | 'error';
}

// ─── Dexie Database ───────────────────────────────────────────────────────────

export class MarcipanoDB extends Dexie {
  announcements!: Table<Announcement, string>;
  announcementLikes!: Table<AnnouncementLike, string>;
  outbox!: Table<OutboxEntry, number>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('MarcipanoDB');

    this.version(1).stores({
      announcements:     'id, createdAt, targetLevel, targetRole, targetTerritoryId, isRead',
      announcementLikes: 'id, announcementId, memberId, syncedAt',
      outbox:            '++id, queuedAt',
      syncMeta:          'key',
    });
  }
}

export const db = new MarcipanoDB();

db.on('ready', async () => {
  const existing = await db.syncMeta.get('main');
  if (!existing) {
    await db.syncMeta.put({
      key: 'main',
      lastSyncedAt: null,
      lastAttemptAt: null,
      status: 'idle',
    });
  }
});
