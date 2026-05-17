# Marcipano Community — Design Spec

**Date:** 2026-05-17
**Scope:** V1 — Announcements only. Tasks, comments, admin panel are V2.

---

## Overview

Marcipano Community is a mobile-first Android app (Capacitor + React/JS) for a political party to send announcements to members filtered by role, level, and territory unit. Members can read and like announcements offline; everything syncs when back online.

The app is added to the existing `Marsipan/Membership` repo as a new backend project and a new client. It shares the existing `Marsipan.Membership.Middleware` (entities, EF Core, services) and adds new entities alongside the existing ones.

---

## 1. Repo & Solution Structure

```
src/
  backend/
    Marsipan.Membership.sln                      ← Mobile.API added to solution
    Marsipan.Membership.Middleware/              ← existing, extended
    Marsipan.Membership.Web/                     ← existing, untouched
    Marsipan.Membership.Mobile.API/              ← NEW
      Controllers/
        MobileAuthController.cs
        AnnouncementsController.cs
        SyncController.cs
        NotificationsController.cs
        AttachmentsController.cs
      Program.cs
      appsettings.json
      Marsipan.Membership.Mobile.API.csproj

src/
  client/
    MembershipAdmin/                             ← existing, Tailwind v3 → v4 upgrade
    MarcipanoCommunity/                          ← NEW
      src/
        components/      ← AppHeader, BottomNav, SyncStatusBar
        db/              ← schema.js, hooks.js (Dexie)
        notifications/   ← pushService.js
        pages/           ← FeedPage, AnnouncementDetailPage, ComposePage
        sync/            ← syncEngine.js
        framework/       ← api.js, auth.js
      capacitor.config.js
      vite.config.js
      package.json
```

**Ports:**
| Service | HTTP | HTTPS | Vite dev |
|---|---|---|---|
| Marsipan.Membership.Web (existing) | 5145 | 7226 | — |
| MembershipAdmin client (existing) | — | — | 5180 |
| Marsipan.Membership.Mobile.API | 5146 | 7227 | — |
| MarcipanoCommunity client | — | — | 5181 |

---

## 2. New Entities (Middleware)

All added to `Marsipan.Membership.Middleware/Entities/`, registered in existing `AppDbContext`. Existing `Member` and `OrgUnit` entities are unchanged.

```csharp
// MemberCredential.cs
MemberCredential : BaseEntity
  MemberId      int    FK → Member (unique)
  Email         string unique index
  PasswordHash  string BCrypt hash
  LastLoginAt   DateTime?

// Announcement.cs
Announcement : BaseEntity
  Title              string
  Body               string
  AuthorId           int    FK → Member
  TargetLevel        OrgUnitType?   null = all levels
  TargetOrgUnitId    int?           FK → OrgUnit, null = all units
  TargetFunctionId   int?           FK → Function, null = all functions
  Attachments        ICollection<Attachment>
  Likes              ICollection<AnnouncementLike>

// AnnouncementLike.cs
AnnouncementLike : BaseEntity
  AnnouncementId  int  FK → Announcement
  MemberId        int  FK → Member
  // unique index on (AnnouncementId, MemberId)

// Attachment.cs
Attachment : BaseEntity
  AnnouncementId  int?    FK → Announcement, null until linked
  FileName        string  original name
  StoredName      string  {guid}_{originalFileName}
  FileUrl         string
  FileSize        long
  MimeType        string

// FcmSubscription.cs
FcmSubscription : BaseEntity
  MemberId   int     FK → Member
  FcmToken   string  unique index
```

**TargetLevel** reuses the existing `OrgUnitType` enum (`City` / `Municipal`) as the level discriminator — no new enum.

**Role-based targeting uses existing `Function` entities.** No new column on `Member`. `Announcement.TargetFunctionId` (nullable FK → `Function`) replaces the generic `TargetRole` concept. Targeting filter: include if `TargetFunctionId` is null OR the member has that function in their `MemberFunction` records. JWT `role` claim contains all function IDs the member holds (comma-separated or array claim).

**Migrations:** two new migrations added to `Marsipan.Membership.Middleware/Migrations/`:
- `AddMobileAuth` — MemberCredential table
- `AddAnnouncements` — Announcement, AnnouncementLike, Attachment, FcmSubscription tables

---

## 3. New Services (Middleware)

| Service | Responsibility |
|---|---|
| `MobileAuthService` | Credential lookup, BCrypt verify, JWT generation |
| `AnnouncementService` | CRUD, targeting filter, triggers FCM on create |
| `SyncService` | Delta sync query (`since` param), filters by member's OrgUnit + level |
| `FcmNotificationService` | Firebase Admin SDK, batches 500 tokens/call |
| `AttachmentService` | File save/serve, reuses `FileStorageOptions` pattern |

---

## 4. Mobile API Project

`Marsipan.Membership.Mobile.API` — standalone ASP.NET Core Web API, references Middleware, independent JWT config.

**JWT:** separate secret and audience (`"MarcipanoCommunity"`) from the existing Web project. Claims issued on login: `memberId`, `orgUnitId`, `role`, `level`.

**Auth flow:**
- `POST /api/mobile/auth/login` — `{ email, password }` → verifies `MemberCredential` → issues JWT
- No self-registration. Admins provision `MemberCredential` records (via a seeded admin endpoint or direct DB setup in V1).

**Controllers (thin — all business logic in services):**

| Controller | Endpoints |
|---|---|
| `MobileAuthController` | `POST /api/mobile/auth/login` |
| `AnnouncementsController` | `GET /api/announcements`, `POST /api/announcements`, `POST /{id}/like`, `DELETE /{id}/like` |
| `SyncController` | `GET /api/sync?since={iso}` |
| `AttachmentsController` | `POST /api/attachments/upload` |
| `NotificationsController` | `POST /api/notifications/subscribe`, `DELETE /api/notifications/unsubscribe` |

**Sync response envelope:**
```json
{
  "announcements": [{ "...fields", "attachments": [] }],
  "announcementLikes": [],
  "serverTime": "ISO timestamp"
}
```

**Targeting filter in SyncService:** an announcement is included if all three conditions pass:
- `TargetOrgUnitId` is null OR equals the member's `OrgUnitId`
- AND `TargetLevel` is null OR equals the member's OrgUnit's `Type`
- AND `TargetFunctionId` is null OR the member has that function in their `MemberFunction` records

**File storage:** uploaded attachments stored under `uploads/mobile/` (separate subfolder from existing form images), served via static files middleware at `/uploads/mobile`.

---

## 5. Mobile Client (MarcipanoCommunity)

**Stack:** React 18 + JavaScript (.jsx), Vite, Tailwind v4, Capacitor v6, Dexie.js, React Router v6.

**Auth storage:** `sessionStorage` — `access_token`, `user_id`, `user_name` (for avatar initials).

**Offline-first data flow:**
```
Online:  Mobile API → syncEngine.js → Dexie → UI (useLiveQuery)
Offline: Dexie → UI (useLiveQuery)
Mutations: Dexie + outbox immediately (optimistic) → flush on reconnect
```
No direct API calls from page components. All server communication through `syncEngine.js` or outbox.

**Dexie schema (schema.js):** tables `announcements`, `announcementLikes`, `outbox`, `syncMeta`. `Announcement` embeds `attachments[]` array inline.

**Outbox actions (V1):**
- `LIKE_ANNOUNCEMENT` → `POST /api/announcements/{id}/like`
- `UNLIKE_ANNOUNCEMENT` → `DELETE /api/announcements/{id}/like`
- `CREATE_ANNOUNCEMENT` → `POST /api/announcements`

**Hooks (hooks.js):** `useAnnouncements()`, `useAnnouncement(id)`, `useUnreadCount()`, `useAnnouncementLike(announcementId)`, `useSyncMeta()`, `useOutboxCount()`. No direct `db.*` calls in pages.

**Pages:**
- `FeedPage` — scrollable announcement list, pull-to-refresh
- `AnnouncementDetailPage` — full body, attachments, like button
- `ComposePage` — title, body, targeting dropdowns (level + org unit), attachment upload. Visible only to members whose JWT role claim permits composition; enforced server-side.

**App shell:**
```
<AppHeader />       sticky, context-aware (back arrow on detail, logo on feed)
<SyncStatusBar />   offline / syncing / error — shown only when relevant
<main>              scrollable page content
<BottomNav />       fixed bottom (Feed, Compose)
```

**Theme (CSS variables in index.css):**
```css
:root {
  --color-bg: #0f1729;
  --color-surface: #1a2744;
  --color-accent: #e8b84b;
}
```

**Capacitor:** app ID `com.marcipano.community`, webDir `dist`. FCM via `@capacitor/push-notifications`. Token POSTed to `/api/notifications/subscribe` on registration.

**Naming conventions:** components PascalCase, hooks `use` prefix camelCase, pages in `src/pages/`, shared UI in `src/components/`.

---

## 6. Tailwind v4 Upgrade (Both Clients)

Both clients are upgraded to Tailwind v4 together.

**MembershipAdmin migration steps:**
1. Replace `tailwind.config.js` + `postcss.config.js` with v4 CSS-first config
2. Add `@import "tailwindcss"` to main CSS entry point
3. Remove `content` array (v4 auto-detects source files)
4. Audit and fix any deprecated utility classes
5. Verify build passes (`npm run build`)

**MarcipanoCommunity** starts on v4 from scratch — no migration needed.

---

## 7. What Is Out of Scope (V1)

- Member self-registration
- JWT refresh tokens
- Admin web UI for announcements
- Tasks, comments, notification read receipts
- Attachment preview in-app
- `DueDateReminderJob` (scaffolded in spec but V2)
