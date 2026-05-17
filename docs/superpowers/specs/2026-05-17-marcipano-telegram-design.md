# Marcipano Telegram Mini App — Design Spec

**Date:** 2026-05-17
**Scope:** V1 — Announcements only (read, like, compose). Separate app from Marcipano Community (spec 1).

---

## Overview

A Telegram Mini App for party members to receive, read, and like targeted announcements — and for authorized members to compose them. Telegram handles auth (via `initData`), push notifications (via bot messages), and app distribution (no app store). Members are linked to their `Member` record automatically by matching their Telegram phone number against existing `Phone` records in the Membership database.

The app adds one new backend project (`Marsipan.Membership.Telegram.API`) and one new client (`MarcipanoTelegram`) to the existing repo. It shares `Marsipan.Membership.Middleware` with the rest of the system and depends on the announcement entities defined in the Marcipano Community spec (spec 1).

---

## 1. Repo & Solution Structure

```
src/
  backend/
    Marsipan.Membership.sln
    Marsipan.Membership.Middleware/          ← existing, extended (TelegramLink entity)
    Marsipan.Membership.Web/                 ← existing, untouched
    Marsipan.Membership.Telegram.API/        ← NEW
      Controllers/
        TelegramAuthController.cs
        AnnouncementsController.cs
        SyncController.cs
        AttachmentsController.cs
      Services/
        TelegramBotService.cs               ← IHostedService
      Program.cs
      appsettings.json
      Marsipan.Membership.Telegram.API.csproj

src/
  client/
    MembershipAdmin/                         ← existing
    MarcipanoTelegram/                       ← NEW
      src/
        components/    ← AppHeader, SyncStatusBar
        db/            ← schema.js, hooks.js
        pages/         ← FeedPage, AnnouncementDetailPage, ComposePage
        sync/          ← syncEngine.js
        framework/     ← api.js, auth.js, telegram.js
      vite.config.js
      package.json
```

**Ports:**
| Service | HTTP | HTTPS | Vite dev |
|---|---|---|---|
| Marsipan.Membership.Telegram.API | 5147 | 7228 | — |
| MarcipanoTelegram client | — | — | 5182 |

---

## 2. New Entity (Middleware)

Added to `Marsipan.Membership.Middleware/Entities/`, registered in existing `AppDbContext`.

```csharp
// TelegramLink.cs
TelegramLink : BaseEntity
  MemberId         int    FK → Member (unique)
  TelegramUserId   long   unique index  ← Telegram's numeric user ID
  TelegramUsername string?              ← optional, for display
  LinkedAt         DateTime
```

**Linking flow:** on first Mini App open, `initData` provides the user's phone number. `TelegramAuthController` looks up a `Phone` record matching that number → finds the `Member` → creates `TelegramLink` → issues JWT. Subsequent logins resolve directly via `TelegramUserId`, skipping the phone lookup.

**Migration:** `AddTelegramLink` — single new table.

**Dependency:** this spec also depends on `Announcement`, `AnnouncementLike`, `Attachment`, and `FcmSubscription` entities defined in the Marcipano Community spec (spec 1). Both specs share the same Middleware and migration history.

---

## 3. New Service (Middleware)

| Service | Responsibility |
|---|---|
| `TelegramAuthService` | `initData` HMAC-SHA256 validation, phone lookup, `TelegramLink` upsert, JWT generation |

Announcement-related services (`AnnouncementService`, `SyncService`, `AttachmentService`) are defined in spec 1 and reused here without modification.

---

## 4. Telegram API Project

`Marsipan.Membership.Telegram.API` — standalone ASP.NET Core Web API, references Middleware, independent JWT config.

**JWT:** separate secret and audience (`"MarcipanoTelegram"`). Claims issued on login: `memberId`, `orgUnitId`, `functionIds` (all member function IDs, array claim), `telegramUserId`.

**Auth flow:**
1. Mini App sends `initData` string to `POST /api/telegram/auth`
2. Server validates HMAC-SHA256 using bot token — rejects if invalid or older than 5 minutes
3. Extracts `phone_number` from validated payload → looks up matching `Phone` record → resolves `Member`
4. Creates or updates `TelegramLink` for the `TelegramUserId`
5. Returns JWT

**Controllers (thin — all business logic in services):**

| Controller | Endpoints |
|---|---|
| `TelegramAuthController` | `POST /api/telegram/auth` |
| `AnnouncementsController` | `GET /api/announcements`, `POST /api/announcements`, `POST /{id}/like`, `DELETE /{id}/like` |
| `SyncController` | `GET /api/sync?since={iso}` |
| `AttachmentsController` | `POST /api/attachments/upload` |

**Sync response envelope** (identical to spec 1):
```json
{
  "announcements": [{ "...fields", "attachments": [] }],
  "announcementLikes": [],
  "serverTime": "ISO timestamp"
}
```

**Targeting filter** (identical to spec 1): announcement included if:
- `TargetOrgUnitId` is null OR equals the member's `OrgUnitId`
- AND `TargetLevel` is null OR equals the member's OrgUnit's `Type`
- AND `TargetFunctionId` is null OR the member has that function in their `MemberFunction` records

**`TelegramBotService` (IHostedService):**
- Initializes `Telegram.Bot` client on startup using `BotToken` from config
- Registers itself as an `IAnnouncementNotifier` implementation (interface defined in Middleware, injected into `AnnouncementService` via DI). `AnnouncementService.CreateAsync()` calls `IAnnouncementNotifier.NotifyAsync()` after saving — `TelegramBotService` implements this interface and fans out the messages.
- On announcement created: queries `TelegramLink` records for all members matching the targeting triple → sends a Telegram message to each `TelegramUserId` containing the announcement title and a "Read" button that opens the Mini App URL
- Batches sends to stay within Telegram Bot API rate limits (30 messages/second)

**File storage:** uploaded attachments stored under `uploads/telegram/` (separate subfolder), served via static files middleware at `/uploads/telegram`.

**Config (`appsettings.json`):**
```json
"Telegram": {
  "BotToken": "...",
  "MiniAppUrl": "https://your-deployed-mini-app-url"
},
"Jwt": {
  "Secret": "...",
  "Issuer": "...",
  "Audience": "MarcipanoTelegram"
}
```

---

## 5. Telegram Mini App Client

**Stack:** React 18 + JavaScript (.jsx), Vite, Tailwind v4, Dexie.js, React Router v6. No Capacitor, no FCM.

**Auth (`framework/telegram.js`):**
1. Read `window.Telegram.WebApp.initData` on app load
2. POST to `/api/telegram/auth` → receive JWT
3. Store `access_token`, `user_id`, `user_name` in `sessionStorage`
4. Call `window.Telegram.WebApp.ready()` and `expand()`

**Offline-first data flow:**
```
Online:  Telegram API → syncEngine.js → Dexie → UI (useLiveQuery)
Offline: Dexie → UI (useLiveQuery)
Mutations: Dexie + outbox immediately (optimistic) → flush on reconnect
```
No direct API calls from page components.

**Dexie schema (`db/schema.js`):** tables `announcements`, `announcementLikes`, `outbox`, `syncMeta`. `Announcement` embeds `attachments[]` inline.

**Outbox actions (V1):**
- `LIKE_ANNOUNCEMENT` → `POST /api/announcements/{id}/like`
- `UNLIKE_ANNOUNCEMENT` → `DELETE /api/announcements/{id}/like`
- `CREATE_ANNOUNCEMENT` → `POST /api/announcements`

**Hooks (`db/hooks.js`):** `useAnnouncements()`, `useAnnouncement(id)`, `useUnreadCount()`, `useAnnouncementLike(announcementId)`, `useSyncMeta()`, `useOutboxCount()`.

**Pages:**
- `FeedPage` — scrollable announcement list, pull-to-refresh
- `AnnouncementDetailPage` — full body, attachments, like button
- `ComposePage` — title, body, targeting dropdowns (level + org unit + function), attachment upload. Visible only to members whose `functionIds` JWT claim includes a composing-eligible function; enforced server-side.

**App shell — no `BottomNav`** (Telegram provides its own chrome):
```
<AppHeader />       uses Telegram.WebApp.BackButton instead of custom back arrow
<SyncStatusBar />   offline / syncing / error — shown only when relevant
<main>              scrollable page content
```

**Theme:** inherits Telegram's native CSS variables as primary palette — keeps the Mini App visually consistent with the user's Telegram theme:
```css
:root {
  --color-bg:      var(--tg-theme-bg-color);
  --color-surface: var(--tg-theme-secondary-bg-color);
  --color-accent:  var(--tg-theme-button-color);
  --color-text:    var(--tg-theme-text-color);
}
```
Tailwind config extended with these variables. Fallback values set for local dev (where `window.Telegram` is absent).

**Deployment:** standard Vite web build (`dist/`) served over HTTPS. Mini App URL registered with BotFather.

---

## 6. What Is Out of Scope (V1)

- Member self-registration or self-linking (phone match is automatic; no fallback flow if phone not found)
- JWT refresh tokens
- Admin web UI for announcements
- Tasks, comments, notification read receipts
- Attachment preview in-app
- Bot commands beyond notification delivery (e.g. `/help`, `/subscribe`)
