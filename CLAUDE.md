# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The membership app is **implemented** per the NextBlink architecture standard (issues #1–#23 landed the original scope). Since then the codebase has grown well past that original scope: `OrgUnit` was renamed to `Committee`, a `Municipality` entity was added, and two large modules have landed — a **call-center** module (issue #56) and a separate **Telegram/member-app** module (its own backend project + its own frontend client). See "Modules beyond the original scope" below.

- Backend solution: `src/backend/Marsipan.Membership.sln`
  - `Marsipan.Membership.Middleware/` — entities, EF Core `ApplicationContext`, migrations, services, DTOs, options
  - `Marsipan.Membership.Web/` — controllers (public + `Controllers/Admin/`), `Program.cs`, JWT/auth wiring, `wwwroot/uploads/`
  - `Marsipan.Membership.Telegram.API/` — separate Web API project for the Telegram bot/member-app backend (announcements, events, attachments, sync, Telegram auth)
  - `Marsipan.Membership.Tests/`, `Marsipan.Membership.Telegram.Tests/` — test projects
- Frontend: `src/client/MembershipAdmin/` (admin app) and `src/client/MarcipanoTelegram/` (member-facing Telegram Mini App / PWA, Dexie/IndexedDB-backed)
  - `src/pages/` — route-level pages, one subfolder per feature: `dashboard/`, `members/`, `forms/`, `committees/`, `bodies/`, `functions/`, `users/`, `profile/`, `login/`, `upload/` (mobile upload flow), `callcenter/` (9 pages: campaigns, contacts/import, pools, queue, script, reports)
  - `src/framework/` — `api.js`, `auth.js`, `private-route.jsx`, `i18n.js`
  - `src/services/router.jsx` — router definitions (**not** under `framework/`)
  - `src/components/` — `AppLayout.jsx`, `AppHeader.jsx`, `AppSidebar.jsx`, `Backdrop.jsx`, `Toast.jsx`, `ConfirmModal.jsx`
  - `src/context/` — `SidebarContext.jsx`, `ThemeContext.jsx`
  - `src/locales/` — i18next English/Serbian translation JSON (auth, common, committees, dashboard, enums, forms, functions, members, profile, users)
  - `src/services/` — business helpers (`dateUtils.js`, `transliteration.js`, `version.js`) plus call-center helpers (`callCenterApi.js`, `callScript.js`)
- Spec: `membership-app-instructions.md` at repo root. Predates the Committee rename, Municipality entity, and the call-center/Telegram modules — treat it as historical background for the original entities/enums/roles, not as current truth for anything added since.
- Architecture doc: `docs/architecture.md`.

## Alignment with NextBlink standard

The project follows the global NextBlink standard (Middleware + Web + React/Vite/Tailwind/TailAdmin) with these deliberate, landed deviations:

| Concern | NextBlink default | This project | Reason |
|---|---|---|---|
| .NET version | .NET 10 | **.NET 10** | matches default; spec said .NET 9, we chose .NET 10 because the SDK is installed |
| Frontend language | (flexible) TS/JS | **JavaScript `.jsx`** | per spec / scaffold choice — no TypeScript |
| JWT storage | `sessionStorage` | **`localStorage`** | kept from spec; intentional override |
| Soft delete | `BaseModel` with `IsDeleted` | **`BaseEntity` with `IsDeleted`** | adopted (spec said hard delete was fine; we went with soft delete) |
| Admin UI shell | TailAdmin required | **TailAdmin adopted** | matches default |
| Form-image lifecycle | (not specified) | **Cascade-delete on-disk files on Form soft-delete** | metadata rows soft-deleted with parent; underlying files physically removed to avoid orphaned storage |
| Tailwind version | (latest) | **v4** (`@tailwindcss/vite` plugin, no `tailwind.config.js`/`postcss.config.js`) | migrated from the originally-pinned v3; the v4 migration has already happened — don't re-introduce v3 config |
| Layering | Repository + Processor + BindingModels | **Services + DTOs (no separate Repository layer)** | matches spec; services talk to `ApplicationContext` directly |
| Backend layout | Two-project Middleware + Web | **Middleware + Web, plus a separate `Telegram.API` project** | core split matches default; the Telegram/member-app backend was split into its own Web API project rather than folded into `Web` |
| Seed data | (flexible) | **Runtime seeders loading embedded JSON, gated by a `Seed` config flag** | migrated off hardcoded `OnModelCreating` seed rows (migration `RemoveHardcodedSeedData`); only `IdentityRole` seed data remains in `OnModelCreating` |

Conventional commits, `issue/<n>-<slug>` branches, EF migrations only (no manual SQL), and functional React with hooks all apply per the global standard.

## Modules beyond the original scope

Two feature areas exist in code that predate documentation are silent on. Both are real, landed, and actively developed:

**Call-center module** (issue #56 and follow-ups) — outbound calling campaigns against imported contact lists.
- Entities: `Campaign`, `CallContact`, `CallAttempt`, `CallPool`, `CallPoolOperator`, `ContactEngagementArea`
- Enums: `CallOutcome`, `PartyRelation`, `ActivityLevel`, `EngagementArea`, `ContactFinalStatus`
- Services: `CampaignService`, `CallContactService`, `CallContactImportService`, `CallPoolService`, `CallCenterReportService`
- Controllers: `Controllers/Admin/{CampaignsController, CallContactsController, CallPoolsController, CallCenterReportsController}.cs`
- Scope filter: `ApplyCallContactScope` in `ScopeFilters.cs` — SuperAdmin/Admin unrestricted; `Operator` sees contacts only in call pools they're assigned to (via `CallPoolOperator`); all other roles see nothing
- Frontend: `src/client/MembershipAdmin/src/pages/callcenter/` (CampaignList, CampaignForm, ContactImport, ContactList, PoolList, PoolForm, CallQueue, CallScript, CallCenterReports), `src/services/callCenterApi.js`, `src/services/callScript.js`

**Telegram / member-app module** — member-facing notifications, events, and a Telegram Mini App.
- Backend: `src/backend/Marsipan.Membership.Telegram.API/` — `Controllers/{AnnouncementsController, AttachmentsController, EventsController, SyncController, TelegramAuthController}.cs`, `Services/TelegramBotService.cs`
- Shared entities (in `Marsipan.Membership.Middleware`): `Announcement`, `AnnouncementLike`, `Attachment`, `Event`, `EventMembership`, `FcmSubscription`, `TelegramLink`
- Options: `Options/TelegramOptions.cs`
- Frontend: `src/client/MarcipanoTelegram/` — separate Vite + React + Tailwind v4 client, Dexie/IndexedDB-backed for offline use

**AI form-extraction** — `Options/AnthropicOptions.cs`, `Services/{IFormExtractionService, FormExtractionService}.cs`, wired via `AddHttpClient` in `Program.cs`. Uses Anthropic's API to extract data from scanned/uploaded form images.

**i18n** — full English/Serbian localization via `i18next`/`react-i18next` in the admin client (`src/framework/i18n.js`, `src/locales/`).

When making domain-rule or architecture changes, check whether they affect these modules too, not just the original Members/Forms/Committees/Functions/Users scope.

## Where things live

| Concern | Path |
|---|---|
| Core entities (`BaseEntity`, `Member`, `Form`, `Committee`, `Municipality`, `Function`, `Phone`, `MemberFunction`, `FormImage`, `ApplicationUser`) | `src/backend/Marsipan.Membership.Middleware/Entities/` |
| Call-center entities (`Campaign`, `CallContact`, `CallAttempt`, `CallPool`, `CallPoolOperator`, `ContactEngagementArea`) | same, `Entities/` |
| Telegram/member-app entities (`Announcement`, `AnnouncementLike`, `Attachment`, `Event`, `EventMembership`, `FcmSubscription`, `TelegramLink`) | same, `Entities/` |
| Enums (single file, all enums) | `src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs` |
| `ApplicationContext` (the EF `DbContext`) | `src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs` |
| Seed data (runtime seeders + embedded JSON) | `src/backend/Marsipan.Membership.Middleware/Data/{SeedDataLoader, FunctionsSeeder, CommitteesSeeder, MunicipalitiesSeeder, MembersSeeder}.cs` |
| EF Core migrations | `src/backend/Marsipan.Membership.Middleware/Migrations/` |
| Services (business logic, scope filters, file storage, auth, call-center, Telegram support) | `src/backend/Marsipan.Membership.Middleware/Services/` |
| DTOs | `src/backend/Marsipan.Membership.Middleware/DTOs/` |
| Strongly-typed options (`JwtOptions`, `FileStorageOptions`, `TelegramOptions`, `AnthropicOptions`) | `src/backend/Marsipan.Membership.Middleware/Options/` |
| API controllers (admin) | `src/backend/Marsipan.Membership.Web/Controllers/Admin/` |
| `AuthController`, `Program.cs`, DI/JWT/CORS wiring | `src/backend/Marsipan.Membership.Web/` |
| Uploaded form images | `src/backend/Marsipan.Membership.Web/wwwroot/uploads/forms/{formId}/` |
| Telegram/member-app backend | `src/backend/Marsipan.Membership.Telegram.API/` |
| Admin client pages | `src/client/MembershipAdmin/src/pages/<feature>/` |
| Admin client framework (api/auth/route-guard/i18n) | `src/client/MembershipAdmin/src/framework/` |
| Admin client router | `src/client/MembershipAdmin/src/services/router.jsx` |
| Admin shared UI components (layout, header, sidebar, modals) | `src/client/MembershipAdmin/src/components/` |
| Admin client services (validation, helpers, call-center API) | `src/client/MembershipAdmin/src/services/` |
| Member-facing Telegram client | `src/client/MarcipanoTelegram/` |

## Local setup gotchas (read before running)

- **JWT secret is a placeholder.** `appsettings.json` ships with `"SecretKey": "REPLACE_WITH_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS_FOR_HS256"`. Replace it (use `appsettings.Development.json` or user-secrets locally; an env var or KeyVault in production) before deploying. Do not commit a real secret.
- **Seed data runs conditionally.** Functions/Committees/Municipalities/Members are seeded at startup from embedded JSON when the `Seed` config flag is enabled — check `Program.cs` and `appsettings*.json` before assuming a fresh DB will be populated. Only `IdentityRole` rows are still seeded via `OnModelCreating`.
- **`/api/auth/change-password` is not implemented server-side.** The profile page (`pages/profile/Profile.jsx`) posts to it and handles a 404 gracefully — the UI exists, but the endpoint needs to be added to `AuthController` + `AuthService` before the change-password form does anything useful.

## Domain rules that aren't obvious from the entities

- **JMBG uniqueness** is enforced by a unique index **and** a 409 Conflict at the API. Don't drop either.
- **`CreatedByUserId` on `Form`** is set server-side from JWT claims. Never trust client input for it.
- **Scope filtering** is role-dependent and centralized in `Middleware/Services/ScopeFilters.cs`. Three filters: `ApplyMemberScope` (Member queries), `ApplyFormScope` (Form queries), `ApplyCallContactScope` (CallContact queries).
  - `SuperAdmin`/`Admin` → no filter (Member/Form scopes)
  - `Operator` on Forms → filtered by `CreatedByUserId` (not by Committee)
  - `Operator` on CallContacts → filtered to call pools they're assigned to (`CallPoolOperator`)
  - `LocalAdmin`/`Viewer` and other restricted roles → filtered by the user's committee (Member/Form scopes); see **nothing** for call-center data
- **Committee hierarchy** (formerly `OrgUnit`) is City → Municipal (plus `MainCommittee`/`ExecutiveCommittee`/`Presidency` values on `CommitteeType`) with `OnDelete(DeleteBehavior.Restrict)` — cascading deletes will break seeded data. **The JWT claim is still named `orgUnitId`** even though the underlying entity is `Committee` — this was a deliberate choice to avoid a breaking client/token change, not an oversight.
- **`Municipality` is a separate entity from `Committee`** — its own hierarchy (`ParentId`/`Children`), `VoterCount`, `IsCity`, `PostalCode`, geo fields (`Lat`/`Lng`), and an `OoId` back-reference to `Committee`.
- **Form images** carry an `Order` field for drag-and-drop reordering; preserve it in any image-mutation endpoint.
- **VoterCount** exists on **both** `Committee` and `Municipality`, drives the dashboard `% membership` calculation, and is SuperAdmin-editable only.
- **Soft delete via `BaseEntity`** — entities use `IsDeleted` plus an EF query filter. Form soft-delete cascades to on-disk image files (files physically removed; metadata soft-deleted).

## File storage

Form images are stored at `src/backend/Marsipan.Membership.Web/wwwroot/uploads/forms/{formId}/{fileName}` and served by the static-files middleware. Accepted types: `jpg`, `jpeg`, `png`, `webp`, `pdf`. Max 10MB per image. No blob/S3 abstraction — keep it local until the spec changes.

## Pagination contract

Every list endpoint returns `{ items, totalCount, page, pageSize, totalPages }` and accepts filters via query params (see spec §Search & Filtering). Don't invent a different envelope.

## Ports

Claimed in the user's global port registry:
- Backend HTTP: **5145**
- Backend HTTPS: **7226**
- Frontend Vite (MembershipAdmin): **5180**

## Workflow expectations (from user global config)

- **Plan first, then implement.** Present a numbered plan and wait for confirmation before writing code.
- After plan approval, create one GitHub issue per task (`gh issue create`), then map dependencies into execution waves and confirm again before starting.
- Use branches named `issue/<number>-<slug>`, conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`), and reference issue numbers in commits.
- Repo: `nextblink/DS.Membership`. Project board: `nextblink` user project #1 ("Membership"). Field/option IDs are stored in the user's memory file for this project.
