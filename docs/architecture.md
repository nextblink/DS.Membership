# Architecture

This document describes the high-level architecture for the Marsipan Membership application — a political-party membership management system.

## Solution Layout

The backend is a two-project .NET solution located under `src/backend/`:

```
src/backend/
  Marsipan.Membership.Middleware/   # Class library — domain, data, services, options, DTOs
  Marsipan.Membership.Web/          # ASP.NET Core Web API — controllers, Program.cs, config
  Marsipan.Membership.sln
```

The React client lives under `src/client/` and is scaffolded independently (Vite + React + TypeScript + Tailwind + Axios + React Router v6).

## Dependency Direction

```
Web  ──►  Middleware
```

The Web project references the Middleware project. The Middleware project must never reference Web. All business logic, data access, and domain types live in Middleware; Web is a thin transport/composition layer (controllers, DI registration, middleware pipeline, JWT setup).

## Where Things Live

| Concern | Project | Folder |
|---|---|---|
| Entities (`Member`, `Form`, `OrgUnit`, `Function`, `Phone`, `MemberFunction`, `FormImage`, `ApplicationUser`) | Middleware | `Models/` |
| Enums (`Gender`, `MaritalStatus`, `EducationLevel`, `PhoneType`, `OrgUnitType`, `FormStatus`) | Middleware | `Enums/` |
| `AppDbContext` and EF Core configuration | Middleware | `Data/` |
| EF Core migrations | Middleware | `Migrations/` |
| Services (business logic, scope filters, orchestration) | Middleware | `Services/` |
| DTOs / request & response models | Middleware | `DTOs/` |
| Strongly-typed configuration (`JwtOptions`, `FileStorageOptions`, etc.) | Middleware | `Options/` |
| Helpers (formatting, validation utilities) | Middleware | `Helpers/` |
| API controllers | Web | `Controllers/` |
| `Program.cs`, DI registration, middleware pipeline | Web | (root) |
| `appsettings*.json`, `launchSettings.json` | Web | (root, `Properties/`) |
| Uploaded form images | Web | `wwwroot/uploads/forms/{formId}/` |

## Authentication & Authorization

- ASP.NET Core Identity manages users (`ApplicationUser` extends `IdentityUser`) and roles.
- JWT Bearer is the sole API authentication scheme.
- **JWT claims must include `role` and `orgUnitId`** in addition to standard identity claims. The frontend reads these claims; the backend uses them in centralized scope filters.
- Roles: `SuperAdmin`, `Admin`, `LocalAdmin`, `Operator`, `Viewer`.
- Scope filtering is applied centrally (e.g. `ApplyScopeFilter` for `Member` queries, `ApplyFormScopeFilter` for `Form` queries) — never duplicated per-controller.

## Base Entity / Audit

A `BaseEntity` (in `Middleware/Models/`) provides audit fields:

- `Id` (int PK)
- `CreatedDate`, `LastModifiedDate` (UTC `DateTime`)
- `CreatedByUserId`, `LastModifiedByUserId` (string, FK to `AspNetUsers`)
- `IsDeleted` (bool, soft-delete flag)

Entities that need auditing inherit from `BaseEntity`. Soft-deletes are enforced via an EF query filter so deleted rows are invisible to normal queries.

> Note: the original spec (`membership-app-instructions.md` §Key Implementation Notes #5) says hard delete is fine. We are adopting a `BaseEntity` with soft-delete because the broader NextBlink standard requires it and the issue brief for this scaffold calls it out explicitly. See "Decisions and deviations" below.

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

## Ports

- Backend HTTP: **5145**
- Backend HTTPS: **7226**
- Frontend Vite dev server: **5180**

## Decisions and Deviations

| Topic | Decision |
|---|---|
| .NET version | **.NET 10** (SDK 10.0.203 is available on the dev machine). The spec mentions .NET 9; we are scaffolding on .NET 10 since it is installed and supported. |
| Backend layout | **Two-project Middleware + Web** (per the NextBlink standard and the issue #1 brief), not the single-`Api` layout sketched in `membership-app-instructions.md`. |
| Frontend language | **JavaScript** on the client per scaffold direction (the spec allows either; React Router v6 + Axios + Tailwind are required). |
| JWT storage on client | **`localStorage`** (per spec and project `CLAUDE.md`). |
| Soft delete | Adopted via `BaseEntity` with `IsDeleted`. **Form soft-delete cascades to on-disk image files** (files physically removed; DB rows soft-deleted). |
| Admin UI shell | **TailAdmin** adopted as the admin-panel template/base, customized with Tailwind utility classes per the NextBlink standard. |

These deviations should be revisited if/when the spec is updated.
