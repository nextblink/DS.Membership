# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

This repo is **pre-implementation**. The only file is `membership-app-instructions.md` — a full spec for a political party membership management app. No solution, projects, or frontend exist yet. The first task is scaffolding from that spec.

Always read `membership-app-instructions.md` before generating code. It is the source of truth for entities, enums, endpoints, roles, and page-level behavior.

## Architecture overrides vs. the global standard

The user's global `~/.claude/CLAUDE.md` defines a default architecture (Middleware + Web class-library split, Repository/Processor pattern, TailAdmin React frontend). **This project's spec deviates** — when the two conflict, follow the spec:

| Concern | Global default | This project (spec) |
|---|---|---|
| Backend layout | Two-project: `<Co>.<Product>.Middleware` + `.Web` | Single `Api` project under `/src/Api` with `Controllers/DTOs/Services/Models/Enums/Data` folders |
| Layering | Repository + Processor + BindingModels | Services + DTOs (no repository layer) |
| .NET version | .NET 10 | **.NET 9** |
| Base entity | `BaseModel` with audit fields + `IsDeleted` soft delete | No `BaseModel`; **hard delete is fine** (spec note 5) |
| Frontend | React + TailAdmin (required) | React + Vite + Tailwind, **TypeScript**, Axios, React Router v6 — no TailAdmin requirement |
| JWT storage | sessionStorage | **localStorage** (spec) |
| Auth claims | — | JWT must carry `role` and `orgUnitId` claims |

Keep the global standard's conventions where the spec is silent (EF migrations only — never manual SQL; functional React with hooks; conventional commits; `issue/<n>-<slug>` branches).

## Domain rules that aren't obvious from the entity definitions

- **JMBG uniqueness** is enforced both by a unique index *and* a 409 Conflict at the API. Don't drop either.
- **`CreatedByUserId` on Form** is set server-side from JWT claims. Never trust client input for it.
- **Scope filtering** is role-dependent and centralized. Two filters in spec (`ApplyScopeFilter` for Members, `ApplyFormScopeFilter` for Forms):
  - `SuperAdmin`/`Admin` → no filter
  - `Operator` on Forms → filtered by `CreatedByUserId` (not OrgUnit)
  - All other restricted roles → filtered by the user's `OrgUnitId`
- **OrgUnit hierarchy** is City → Municipal with `OnDelete(DeleteBehavior.Restrict)` — cascading deletes will break seeded data.
- **Form images** carry an `Order` field for drag-and-drop reordering; preserve it in any image-mutation endpoint.
- **VoterCount** lives on `OrgUnit`, drives the dashboard `% membership` calculation, and is SuperAdmin-editable only.
- **Seed data is part of `OnModelCreating`** (Functions, OrgUnits, IdentityRoles) — changing it requires a new migration, not a runtime seeder.

## File storage

Form images are stored on local disk at `wwwroot/uploads/forms/{formId}/{fileName}` and served by static files middleware. Accepted types: jpg, jpeg, png, webp, pdf. Max 10MB per image. There is no blob/S3 abstraction — keep it local until the spec changes.

## Ports

The user maintains a global port registry in `~/.claude/CLAUDE.md`. Next available at the time of this file: backend HTTP **5145**, HTTPS **7226**, frontend Vite **5180**. Claim these (or the next free ones) and add the entries back to the global registry when scaffolding.

## Workflow expectations (from user global config)

- **Plan first, then implement.** Present a numbered plan and wait for confirmation before writing code.
- After plan approval, create one GitHub issue per task (`gh issue create`), then map dependencies into execution waves and confirm again before starting.
- Use branches named `issue/<number>-<slug>`, conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`), and reference issue numbers in commits.
- The GitHub repo/project for this codebase isn't yet recorded — ask the user before running `gh` commands.

## Pagination contract

Every list endpoint returns `{ items, totalCount, page, pageSize, totalPages }` and accepts filters via query params (see spec §Search & Filtering). Don't invent a different envelope.
