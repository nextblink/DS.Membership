# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

The membership app is **implemented** per the NextBlink architecture standard (issues #1–#23 are merged to `main`). The codebase follows the Middleware + Web split on the backend and a Vite + React/JS + Tailwind + TailAdmin client on the frontend.

- Backend solution: `src/backend/Marsipan.Membership.sln`
  - `Marsipan.Membership.Middleware/` — entities, EF Core `AppDbContext`, migrations, services, DTOs, options
  - `Marsipan.Membership.Web/` — controllers (public + `Controllers/Admin/`), `Program.cs`, JWT/auth wiring, `wwwroot/uploads/`
- Frontend: `src/client/MembershipAdmin/`
  - `src/pages/` — route-level pages (dashboard, members, forms, org-units, functions, users, profile, login)
  - `src/framework/` — `api.js`, `auth.js`, `private-route.jsx`, `router.jsx`
  - `src/components/` — `DefaultLayout.jsx`, `Header.jsx`, `Sidebar.jsx`
  - `src/services/` — business helpers (validation/formatting)
- Spec: `membership-app-instructions.md` at repo root. Still the source of truth for entities/enums/endpoints/roles/page behavior. Cross-reference it before changing domain rules.
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
| Tailwind version | (latest) | **Pinned to v3 (`^3.4.x`)** | intentional — v4's new config/PostCSS syntax breaks the existing init; do not upgrade without a full migration pass |
| Layering | Repository + Processor + BindingModels | **Services + DTOs (no separate Repository layer)** | matches spec; services talk to `AppDbContext` directly |
| Backend layout | Two-project Middleware + Web | **Two-project Middleware + Web** | matches default (spec sketched a single `Api` project) |

Conventional commits, `issue/<n>-<slug>` branches, EF migrations only (no manual SQL), and functional React with hooks all apply per the global standard.

## Where things live

| Concern | Path |
|---|---|
| Entities (inc. `BaseEntity`, `Member`, `Form`, `OrgUnit`, `Function`, `Phone`, `MemberFunction`, `FormImage`, `ApplicationUser`) | `src/backend/Marsipan.Membership.Middleware/Entities/` |
| Enums | `src/backend/Marsipan.Membership.Middleware/Enums/` |
| `AppDbContext`, seed data | `src/backend/Marsipan.Membership.Middleware/Data/` |
| EF Core migrations | `src/backend/Marsipan.Membership.Middleware/Migrations/` |
| Services (business logic, scope filters, file storage, auth) | `src/backend/Marsipan.Membership.Middleware/Services/` |
| DTOs | `src/backend/Marsipan.Membership.Middleware/DTOs/` |
| Strongly-typed options (`JwtOptions`, `FileStorageOptions`) | `src/backend/Marsipan.Membership.Middleware/Options/` |
| API controllers (admin) | `src/backend/Marsipan.Membership.Web/Controllers/Admin/` |
| `AuthController`, `Program.cs`, DI/JWT/CORS wiring | `src/backend/Marsipan.Membership.Web/` |
| Uploaded form images | `src/backend/Marsipan.Membership.Web/wwwroot/uploads/forms/{formId}/` |
| Client pages | `src/client/MembershipAdmin/src/pages/` |
| Client framework (api/auth/route-guard/router) | `src/client/MembershipAdmin/src/framework/` |
| Shared UI components (layout, header, sidebar) | `src/client/MembershipAdmin/src/components/` |
| Client services (validation, helpers) | `src/client/MembershipAdmin/src/services/` |
| Router definitions | `src/client/MembershipAdmin/src/framework/router.jsx` |

## Local setup gotchas (read before running)

- **JWT secret is a placeholder.** `appsettings.json` ships with `"SecretKey": "REPLACE_WITH_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS_FOR_HS256"`. Replace it (use `appsettings.Development.json` or user-secrets locally; an env var or KeyVault in production) before deploying. Do not commit a real secret.
- **`dotnet ef database update` has NOT been run** as part of the merge. Migrations are committed under `Marsipan.Membership.Middleware/Migrations/`, but the local SQL Server database has not been created/updated. Run it locally before first launch:
  ```powershell
  dotnet ef database update --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Web
  ```
- **`/api/auth/change-password` is not implemented server-side.** The profile page (`pages/profile/Profile.jsx`) posts to it and handles a 404 gracefully — the UI exists, but the endpoint needs to be added to `AuthController` + `AuthService` before the change-password form does anything useful.

## Domain rules that aren't obvious from the entities

- **JMBG uniqueness** is enforced by a unique index **and** a 409 Conflict at the API. Don't drop either.
- **`CreatedByUserId` on `Form`** is set server-side from JWT claims. Never trust client input for it.
- **Scope filtering** is role-dependent and centralized in `Middleware/Services/ScopeFilters.cs` (or equivalent). Two filters: one for `Member` queries, one for `Form` queries.
  - `SuperAdmin`/`Admin` → no filter
  - `Operator` on Forms → filtered by `CreatedByUserId` (not by OrgUnit)
  - All other restricted roles → filtered by the user's `OrgUnitId`
- **OrgUnit hierarchy** is City → Municipal with `OnDelete(DeleteBehavior.Restrict)` — cascading deletes will break seeded data.
- **Form images** carry an `Order` field for drag-and-drop reordering; preserve it in any image-mutation endpoint.
- **VoterCount** lives on `OrgUnit`, drives the dashboard `% membership` calculation, and is SuperAdmin-editable only.
- **Soft delete via `BaseEntity`** — entities use `IsDeleted` plus an EF query filter. Form soft-delete cascades to on-disk image files (files physically removed; metadata soft-deleted).
- **Seed data lives in `OnModelCreating`** (Functions, OrgUnits, IdentityRoles). Changing it requires a new EF migration, not a runtime seeder.

## File storage

Form images are stored at `src/backend/Marsipan.Membership.Web/wwwroot/uploads/forms/{formId}/{fileName}` and served by the static-files middleware. Accepted types: `jpg`, `jpeg`, `png`, `webp`, `pdf`. Max 10MB per image. No blob/S3 abstraction — keep it local until the spec changes.

## Pagination contract

Every list endpoint returns `{ items, totalCount, page, pageSize, totalPages }` and accepts filters via query params (see spec §Search & Filtering). Don't invent a different envelope.

## Ports

Claimed in the user's global port registry:
- Backend HTTP: **5145**
- Backend HTTPS: **7226**
- Frontend Vite: **5180**

## Workflow expectations (from user global config)

- **Plan first, then implement.** Present a numbered plan and wait for confirmation before writing code.
- After plan approval, create one GitHub issue per task (`gh issue create`), then map dependencies into execution waves and confirm again before starting.
- Use branches named `issue/<number>-<slug>`, conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`), and reference issue numbers in commits.
- Repo: `nextblink/DS.Membership`. Project board: `nextblink` user project #1 ("Membership"). Field/option IDs are stored in the user's memory file for this project.
