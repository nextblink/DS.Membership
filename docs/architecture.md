# Architecture

This document describes the high-level architecture for the Marsipan Membership application — a political-party membership management system.

## Solution Layout

The backend is a multi-project .NET solution located under `src/backend/`:

```
src/backend/
  Marsipan.Membership.Middleware/     # Class library — domain, data, services, options, DTOs (shared by both APIs)
  Marsipan.Membership.Web/            # ASP.NET Core Web API — admin/member-management controllers, Program.cs, config
  Marsipan.Membership.Telegram.API/   # ASP.NET Core Web API — Telegram bot / member-app backend
  Marsipan.Membership.Tests/          # Tests for Middleware/Web
  Marsipan.Membership.Telegram.Tests/ # Tests for Telegram.API
  Marsipan.Membership.sln
```

Two React clients live under `src/client/`:
- `MembershipAdmin/` — the admin app (Vite + React 19 + JavaScript `.jsx` + Tailwind v4 + TailAdmin shell + Axios + React Router v7).
- `MarcipanoTelegram/` — a member-facing Telegram Mini App / offline-capable PWA (Vite + React + Tailwind v4 + Dexie/IndexedDB for local storage), talking to `Telegram.API`.

## Dependency Direction

```
Web              ──►  Middleware
Telegram.API     ──►  Middleware
```

Both API projects reference the Middleware project. The Middleware project must never reference Web or Telegram.API. All business logic, data access, and domain types live in Middleware; the two API projects are thin transport/composition layers (controllers, DI registration, middleware pipeline, JWT/Telegram-auth setup).

## Where Things Live

| Concern | Project | Folder |
|---|---|---|
| Core entities (`BaseEntity`, `Member`, `Form`, `Committee`, `Municipality`, `Function`, `Phone`, `MemberFunction`, `FormImage`, `ApplicationUser`) | Middleware | `Entities/` |
| Call-center entities (`Campaign`, `CallContact`, `CallAttempt`, `CallPool`, `CallPoolOperator`, `ContactEngagementArea`) | Middleware | `Entities/` |
| Telegram/member-app entities (`Announcement`, `AnnouncementLike`, `Attachment`, `Event`, `EventMembership`, `FcmSubscription`, `TelegramLink`) | Middleware | `Entities/` |
| Enums (`Gender`, `MaritalStatus`, `EducationLevel`, `PhoneType`, `CommitteeType`, `FormStatus`, `CallOutcome`, `PartyRelation`, `ActivityLevel`, `EngagementArea`, `ContactFinalStatus`) — all in one file | Middleware | `Enums/Enums.cs` |
| `ApplicationContext` (the EF `DbContext`) and EF Core configuration | Middleware | `Data/ApplicationContext.cs` |
| Seed data (runtime seeders reading embedded JSON, gated by a `Seed` config flag) | Middleware | `Data/{SeedDataLoader, FunctionsSeeder, CommitteesSeeder, MunicipalitiesSeeder, MembersSeeder}.cs` |
| EF Core migrations | Middleware | `Migrations/` |
| Services (business logic, scope filters, orchestration) | Middleware | `Services/` |
| DTOs / request & response models | Middleware | `DTOs/` |
| Strongly-typed configuration (`JwtOptions`, `FileStorageOptions`, `TelegramOptions`, `AnthropicOptions`) | Middleware | `Options/` |
| Core API controllers (admin) | Web | `Controllers/Admin/` |
| Call-center API controllers | Web | `Controllers/Admin/{CampaignsController, CallContactsController, CallPoolsController, CallCenterReportsController}.cs` |
| `Program.cs`, DI registration, middleware pipeline | Web | (root) |
| `appsettings*.json`, `launchSettings.json` | Web | (root, `Properties/`) |
| Uploaded form images | Web | `wwwroot/uploads/forms/{formId}/` |
| Telegram bot/member-app controllers (`AnnouncementsController`, `AttachmentsController`, `EventsController`, `SyncController`, `TelegramAuthController`) | Telegram.API | `Controllers/` |
| Telegram bot service | Telegram.API | `Services/TelegramBotService.cs` |

There is no separate `Helpers/` folder — formatting/validation utilities live alongside the relevant service or DTO instead.

## Authentication & Authorization

- ASP.NET Core Identity manages users (`ApplicationUser` extends `IdentityUser`) and roles.
- JWT Bearer is the sole API authentication scheme for `Web`.
- **JWT claims must include `role` and `orgUnitId`** in addition to standard identity claims. The claim is still literally named `orgUnitId` even though the underlying entity was renamed to `Committee` — this was a deliberate choice to avoid a breaking token/client change, not an inconsistency to fix.
- Roles: `SuperAdmin`, `Admin`, `LocalAdmin`, `Operator`, `Viewer`.
- Scope filtering is applied centrally in `Services/ScopeFilters.cs` — never duplicated per-controller. Three filters exist:
  - `ApplyMemberScope` — for `Member` queries
  - `ApplyFormScope` — for `Form` queries
  - `ApplyCallContactScope` — for `CallContact` queries
- Filter behavior:
  - `SuperAdmin`/`Admin` → unrestricted (Member/Form scopes)
  - `Operator` on Forms → filtered by `CreatedByUserId`, not by Committee
  - `Operator` on CallContacts → filtered to contacts in call pools they're assigned to (via `CallPoolOperator`)
  - `LocalAdmin`/`Viewer`/other restricted roles → filtered by the user's committee for Member/Form scopes; see nothing for call-center data
- `Telegram.API` uses its own Telegram-specific auth flow (`TelegramAuthController`, `TelegramAuthService`, `TelegramLink` entity) rather than the admin JWT scheme.

## Base Entity / Audit

A `BaseEntity` (in `Middleware/Entities/`) provides audit fields:

- `Id` (int PK)
- `CreatedDate`, `LastModifiedDate` (UTC `DateTime`)
- `CreatedByUserId`, `LastModifiedByUserId` (string, FK to `AspNetUsers`)
- `IsDeleted` (bool, soft-delete flag)

Entities that need auditing inherit from `BaseEntity`. Soft-deletes are enforced via an EF query filter (`HasQueryFilter(e => !e.IsDeleted)`) so deleted rows are invisible to normal queries. Applied to `Committee`, `Municipality`, `Function`, `Member`, `Form`, `Announcement`, `Event`, `Campaign`, `CallContact`, `CallPool`, and other aggregate roots.

> Note: the original spec (`membership-app-instructions.md` §Key Implementation Notes #5) says hard delete is fine. The implementation uses `BaseEntity` with soft-delete because the broader NextBlink standard requires it.

## Committee / Municipality Hierarchy

- `Committee` (formerly `OrgUnit`, renamed via migrations `RenameOrgUnitsToCommittees` / `RenameFunctionOrgUnitTypeToCommitteeType`) — hierarchy is City → Municipal, plus `CommitteeType` values `MainCommittee`, `ExecutiveCommittee`, `Presidency` for the party's internal committee structure. Uses `OnDelete(DeleteBehavior.Restrict)` — cascading deletes will break seeded data. Carries `TrusteeId`/`Trustee` (nav to `Member`), `IsTrustful`, `MaxMembers`, a computed `NonMunicipality`, and `MunicipalityId`.
- `Municipality` — a separate entity from `Committee`, added later (migration `AddMunicipalityEntity`). Has its own `ParentId`/`Children` hierarchy, `VoterCount`, `IsCity`, `PostalCode`, `Lat`/`Lng`, and an `OoId` back-reference to `Committee`.
- `VoterCount` exists on **both** `Committee` and `Municipality`, drives the dashboard `% membership` calculation, and is SuperAdmin-editable only.

## Seed Data

Most seed data no longer lives in `OnModelCreating`. Migration `RemoveHardcodedSeedData` moved Functions/Committees/Municipalities/Members seeding to runtime seeder classes (`FunctionsSeeder`, `CommitteesSeeder`, `MunicipalitiesSeeder`, `MembersSeeder`) that load from embedded JSON resources via `SeedDataLoader`, invoked from `Program.cs` and gated by a `Seed` configuration flag. Only `IdentityRole` rows are still seeded directly in `OnModelCreating`.

## File Storage

Form images are stored on local disk at `wwwroot/uploads/forms/{formId}/{fileName}` and served by static-files middleware. Accepted types: `jpg`, `jpeg`, `png`, `webp`, `pdf`. Max 10 MB per image. No blob/S3 abstraction.

When a `Form` is soft-deleted, the on-disk files under `wwwroot/uploads/forms/{formId}/` are cascade-deleted (the metadata `FormImage` rows are soft-deleted along with the parent `Form`, but the underlying files are physically removed to avoid orphaned storage).

## Pagination Contract

Every list endpoint returns:

```json
{
  "items": [...],
  "totalCount": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

Filters are passed as query-string parameters per `membership-app-instructions.md` §Search & Filtering.

## Call-Center Module

Landed via issue #56 and follow-ups. Manages outbound calling campaigns against imported contact lists.

- **Entities**: `Campaign`, `CallContact`, `CallAttempt`, `CallPool`, `CallPoolOperator`, `ContactEngagementArea`
- **Enums**: `CallOutcome`, `PartyRelation`, `ActivityLevel`, `EngagementArea`, `ContactFinalStatus`
- **Services**: `CampaignService`, `CallContactService`, `CallContactImportService`, `CallPoolService`, `CallCenterReportService`
- **DTOs**: `CampaignDtos`, `CallContactDtos`, `CallPoolDtos`, `CallCenterReportDtos`
- **Controllers**: `Web/Controllers/Admin/{CampaignsController, CallContactsController, CallPoolsController, CallCenterReportsController}.cs`
- **Scope filter**: `ApplyCallContactScope` — see "Authentication & Authorization" above
- **Frontend**: `MembershipAdmin/src/pages/callcenter/` — `CampaignList`, `CampaignForm`, `ContactImport`, `ContactList`, `PoolList`, `PoolForm`, `CallQueue`, `CallScript`, `CallCenterReports`; supporting `services/callCenterApi.js` and `services/callScript.js`

## Telegram / Member-App Module

A separate backend project and a separate frontend client, distinct from the admin app.

- **Backend**: `Marsipan.Membership.Telegram.API/` — `Controllers/{AnnouncementsController, AttachmentsController, EventsController, SyncController, TelegramAuthController}.cs`, `Services/TelegramBotService.cs`
- **Shared entities** (in Middleware): `Announcement`, `AnnouncementLike`, `Attachment`, `Event`, `EventMembership`, `FcmSubscription` (push notifications), `TelegramLink`
- **Services**: `AnnouncementService`, `AttachmentService`, `EventService`, `SyncService`, `TelegramAuthService`, `IAnnouncementNotifier`
- **Options**: `Options/TelegramOptions.cs`
- **Frontend**: `src/client/MarcipanoTelegram/` — Vite + React + Tailwind v4, Dexie/IndexedDB for offline-capable local storage

## AI Form-Extraction

`Options/AnthropicOptions.cs` and `Services/{IFormExtractionService, FormExtractionService}.cs`, registered via `AddHttpClient` in `Program.cs`. Uses Anthropic's API to extract structured data from scanned/uploaded form images.

## Internationalization

The admin client (`MembershipAdmin`) has full English/Serbian localization via `i18next`/`react-i18next`: `src/framework/i18n.js` plus `src/locales/{en,sr}/*.json` covering auth, common, committees, dashboard, enums, forms, functions, members, profile, and users namespaces.

## Ports

- Backend HTTP: **5152**
- Backend HTTPS: **7231**
- Frontend Vite dev server (MembershipAdmin): **5185**

## Decisions and Deviations (landed)

These deviations from the spec are implemented and merged.

| Topic | Decision |
|---|---|
| .NET version | **.NET 10** (spec said .NET 9). |
| Backend layout | **Middleware + Web**, plus a separate **Telegram.API** project for the bot/member-app backend — not the single-`Api` layout in `membership-app-instructions.md`. |
| Frontend language | **JavaScript `.jsx`** (no TypeScript), across both clients. |
| Tailwind version | **v4** (`@tailwindcss/vite` plugin, no `tailwind.config.js`/`postcss.config.js`). Originally pinned to v3; the v4 migration has since landed — don't reintroduce v3 config. |
| JWT storage on client | **`localStorage`** (per spec). |
| Soft delete | Adopted via `BaseEntity` with `IsDeleted`. **Form soft-delete cascades to on-disk image files** (files physically removed; DB rows soft-deleted). |
| Admin UI shell | **TailAdmin** adopted. |
| Change-password endpoint | **Not implemented server-side.** Client posts to `/api/auth/change-password` and handles 404 gracefully. |
| `OrgUnit` → `Committee` rename | Entity and `OrgUnitType`/`CommitteeType` enum renamed; JWT claim name `orgUnitId` intentionally kept as-is to avoid a breaking token/client change. |
| Seed data | Moved from hardcoded `OnModelCreating` rows to runtime seeders reading embedded JSON, gated by a `Seed` config flag (migration `RemoveHardcodedSeedData`). Only `IdentityRole` seed remains in `OnModelCreating`. |
| Call-center module | Added (issue #56+): campaigns, contact pools, call queue/script UI, reporting — not in the original spec. |
| Telegram/member-app module | Added: separate `Telegram.API` backend + `MarcipanoTelegram` frontend for member-facing announcements/events/notifications — not in the original spec. |
