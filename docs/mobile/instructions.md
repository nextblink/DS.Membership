# Project name — Marcipano Community

Read this file fully before touching any file. It is the single source of truth.

---

## Project overview

**Marcipano Community** is a mobile-first Android app (Capacitor + React) for a political party to send announcements to members filtered by role, level (national → regional → local), and territory unit. Members can read and like announcements offline; everything syncs when back online.

**V1 scope: Announcements only.** Tasks, comments, admin panel are v2.

---

## Monorepo structure

```
/
├── src/                              ← .NET 9 backend
│   ├── Marcipano.API/                ← Controllers, Program.cs, appsettings
│   ├── Marcipano.Application/        ← Service interfaces + implementations, DTOs
│   ├── Marcipano.Domain/             ← Entities, enums (no dependencies)
│   └── Marcipano.Infrastructure/     ← EF Core DbContext, Repos, Migrations, Services
└── client/                           ← React frontend (this folder)
    ├── src/
    │   ├── components/               ← AppHeader, BottomNav, SyncStatusBar
    │   ├── db/                       ← schema.ts (Dexie), hooks.ts
    │   ├── notifications/            ← pushService.ts (Capacitor FCM)
    │   ├── pages/                    ← FeedPage, AnnouncementDetailPage, ComposePage
    │   ├── sync/                     ← syncEngine.ts
    │   ├── App.tsx
    │   └── index.css                 ← single global stylesheet, no CSS modules
    ├── capacitor.config.ts
    ├── vite.config.ts
    └── package.json
```

---

## Frontend rules (React + Vite + Capacitor)

### Stack
- React 18 + TypeScript, Vite, vite-plugin-pwa (Workbox)
- Dexie.js (IndexedDB) + dexie-react-hooks (useLiveQuery)
- React Router v6
- Capacitor v6 — `@capacitor/push-notifications` for FCM
- No Redux, no Zustand — all state from Dexie live queries

### Layout shell (App.tsx)
```
<app-shell>
  <AppHeader />       ← sticky, always visible, context-aware
  <SyncStatusBar />   ← appears only when offline / syncing / error
  <main.page-content> ← scrollable, padded for bottom nav
  <BottomNav />       ← fixed bottom
```

### AppHeader (`src/components/AppHeader.tsx`)
Context-aware — reads current route via `useLocation()`:
- **Feed / Compose**: logo + app name + member context (level · role) on left; bell + avatar on right
- **Detail**: back arrow + "Announcement" title + date subtitle on left; avatar only on right
- **Bell** shows a red dot when `useUnreadCount() > 0`
- **Avatar** shows initials from `sessionStorage.getItem('user_name')`
- Do NOT add a separate back button in page components — the header handles it

### Offline-first pattern (non-negotiable)
```
Online:  API → syncEngine → Dexie → UI (useLiveQuery)
Offline: Dexie → UI (useLiveQuery)
Mutations: Dexie + outbox immediately (optimistic) → flush on reconnect
```
**Never call the API directly from page components.** All server communication goes through `syncEngine.ts` or the outbox.

### DB schema (`src/db/schema.ts`)
Dexie v1 tables: `announcements`, `announcementLikes`, `outbox`, `syncMeta`.
- `Announcement` embeds `Attachment[]` — no separate attachments table in Dexie
- `AnnouncementLike.id` = `${announcementId}_${memberId}`
- All types defined here — import from here, never redefine elsewhere

### Outbox actions (v1)
- `LIKE_ANNOUNCEMENT`   — POST /api/announcements/{id}/like
- `UNLIKE_ANNOUNCEMENT` — DELETE /api/announcements/{id}/like
- `CREATE_ANNOUNCEMENT` — POST /api/announcements (with `attachmentIds[]`)

### Hooks (`src/db/hooks.ts`)
All data access from components must go through hooks — no direct `db.*` calls in pages.
Key hooks: `useAnnouncements()`, `useAnnouncement(id)`, `useUnreadCount()`, `useAnnouncementLike(announcementId)`, `useSyncMeta()`, `useOutboxCount()`.
`toggleLike()` is optimistic — writes locally and queues outbox immediately.

### Auth in frontend
At login, set:
```js
sessionStorage.setItem('access_token', jwt);
sessionStorage.setItem('user_id', userId);
sessionStorage.setItem('user_name', displayName); // used for avatar initials
```
Sync engine reads `access_token` automatically.

### Naming & style conventions
- Components: PascalCase, one per file
- Hooks: `use` prefix, camelCase
- Pages → `src/pages/`, shared UI → `src/components/`
- Single global CSS file `index.css` — extend it, never create new CSS files
- BEM-style class names — no CSS modules, no Tailwind
- CSS variables defined in `:root` in `index.css` — use them everywhere

### Capacitor / FCM notifications
- `pushService.ts` — `registerPushNotifications()` + `setupPushListeners()` called once in `App.tsx`
- FCM token POSTed to `POST /api/notifications/subscribe` on registration
- Tap on notification fires `push-navigate` custom event; `PushNavigationHandler` in `App.tsx` routes it
- `capacitor.config.ts` — app ID `com.marcipano.community`, webDir `dist`

---

## Backend rules (.NET 9, N-tier)

### Layer responsibilities
- **Controllers** (`Marcipano.API`) — thin: parse request, call service, return DTO. Zero business logic.
- **Services** (`Marcipano.Application`) — all business logic. Depend on repo interfaces only.
- **Repositories** (`Marcipano.Infrastructure`) — EF Core queries only. No business logic.
- **Domain** (`Marcipano.Domain`) — entities + enums. Zero dependencies on other layers.

### Conventions
- Controllers inherit `ControllerBase`, `[ApiController]`, `[Route("api/[controller]")]`
- Services injected via interface (`IAnnouncementService`, etc.)
- `async/await` throughout — never `.Result` or `.Wait()`
- DTOs in `Marcipano.Application/DTOs/` — never expose EF entities from controllers
- EF migrations in `Marcipano.Infrastructure/Migrations/`

### Key domain entities (v1)
```
Announcement  — Id, Title, Body, AuthorId, TargetLevel?, TargetRole?, TargetTerritoryId?, CreatedAt, UpdatedAt
Attachment    — Id, AnnouncementId?, FileName, StoredName, FileUrl, FileSize, MimeType, CreatedAt
AnnouncementLike — Id, AnnouncementId, MemberId, CreatedAt
FcmSubscription  — Id, MemberId, FcmToken, CreatedAt, UpdatedAt
Member        — Id, Name, Role, Level (enum), TerritoryUnitId
```

### Sync endpoint contract
`GET /api/sync?since={iso}` — returns delta of records changed after `since` (optional).
Backend filters announcements by current member's `Level` and `TerritoryUnitId` before returning.

```json
{
  "announcements": [{ ...announcement, "attachments": [...] }],
  "announcementLikes": [...],
  "serverTime": "ISO timestamp"
}
```

### Attachment storage (local filesystem)
- Upload: `POST /api/attachments/upload` (multipart, max 10 MB, any file type)
- Stored as `{guid}_{originalFileName}` under `uploads/` directory (configured in appsettings)
- Served as static files via `app.UseStaticFiles()` at `/uploads`
- `AnnouncementId` on `Attachment` is null until announcement is created — link them in `AnnouncementService.CreateAsync()`

### Notifications (FCM via Firebase Admin SDK)
- `FcmNotificationService` — sends via Firebase Admin, batches 500 tokens/call
- Triggered in `AnnouncementService.CreateAsync()` → `SendToTargetAsync()`
- `DueDateReminderJob` — `IHostedService`, fires daily 08:00 UTC (v2 feature, already scaffolded)
- `NotificationsController` — `POST /api/notifications/subscribe`, `DELETE /api/notifications/unsubscribe`

---

## Before making any change

1. Read relevant existing files before editing or creating anything
2. Search for existing interfaces/services before adding new ones
3. Backend: check `Marcipano.Domain` entities before adding DTOs
4. Frontend: check `db/schema.ts` before adding tables; check `db/hooks.ts` before writing inline Dexie queries
5. Never delete EF migrations — add new ones for schema changes
6. After any backend change: `dotnet build` from repo root
7. After any frontend change: `cd client && npm run build` (type-checks on build)

---

## Common task recipes

### Add a new backend endpoint
1. Add/update entity in `Marcipano.Domain` if needed
2. Add DTO in `Marcipano.Application/DTOs/`
3. Add method to service interface → implement in service
4. Add repo method if DB query needed
5. Add controller action (thin — delegate to service)
6. If schema changed: `dotnet ef migrations add <Name> --project Marcipano.Infrastructure --startup-project Marcipano.API`

### Add a new offline-capable feature
1. Bump Dexie version + update `.stores({})` in `db/schema.ts`
2. Add hook in `db/hooks.ts`
3. Add outbox action type if mutation
4. Handle in `syncEngine.ts` → `dispatchAction()`
5. Add backend endpoint
6. Build UI reading from the new hook

### Modify targeting logic
Targeting triple: `targetLevel`, `targetRole`, `targetTerritoryId` — all nullable (null = match all).
Backend filters at sync time. Frontend displays tags. Both must stay consistent.

---

## What NOT to do
- No business logic in controllers
- No direct API calls from React components — use sync/outbox
- No `localStorage` — use `sessionStorage` for auth, Dexie for app data
- No new CSS files — extend `index.css`
- No EF entities in API responses — always DTOs
- No `.Result` or `.Wait()` in .NET async code
- No Dexie schema version bump without updating `.stores({})` definition
- No back button in page components — `AppHeader` handles navigation

---

## App identity
- **App name**: Marcipano Community
- **Short name**: Marcipano
- **Package**: com.marcipano.community
- **Theme color**: `#1a2744`
- **Background**: `#0f1729`
- **Accent**: `#e8b84b`
- **PWA display**: standalone

---

## Build commands (client/)
```bash
npm run dev          # local dev server
npm run build        # Vite build + TypeScript check
npm run cap:sync     # build + sync to android/
npm run cap:build    # build APK
npm run cap:open     # open Android Studio
```

---

## Environment variables

### Backend (appsettings.json / user secrets)
```
ConnectionStrings:Default
Jwt:Secret
Jwt:Issuer
Jwt:Audience
Firebase:ServiceAccountPath    ← path to firebase-service-account.json (git-ignored)
Uploads:Path                   ← e.g. "uploads"
Uploads:BaseUrl                ← e.g. "https://your-server.com/uploads"
```

### Frontend (client/.env)
```
VITE_API_URL=https://localhost:5001
```

---

## Firebase one-time setup
1. Create project at console.firebase.google.com
2. Add Android app — package `com.marcipano.community`
3. Download `google-services.json` → `android/app/`
4. Download service account JSON → `Marcipano.API/firebase-service-account.json` (git-ignored)
5. `dotnet add Marcipano.Infrastructure package FirebaseAdmin`
6. Add migrations: `AddFcmSubscriptions`, `AddAttachments`

---

## V2 roadmap (out of scope now)
- Tasks (assign, complete, due-date reminders)
- Admin panel (user + territory management)
- JWT token refresh interceptor
- Notification read receipts
- Attachment preview in-app
