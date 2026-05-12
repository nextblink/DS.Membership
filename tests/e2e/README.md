# Membership e2e suite

Playwright tests for the DS.Membership admin app. Drives the Vite client at
`http://localhost:5180` against the .NET API at `https://localhost:7226`.

## Prerequisites

- .NET 10 SDK installed and the database migrated (`dotnet ef database update`
  on `src/backend/Marsipan.Membership.Middleware` with
  `src/backend/Marsipan.Membership.Web` as startup project).
- Node 20+.
- Ports `5180` (Vite), `5145` (HTTP API), `7226` (HTTPS API) free — or already
  running, in which case Playwright will reuse the existing servers in local
  mode.

## Install

```powershell
cd tests/e2e
npm install
npm run install:browsers
```

## Run

```powershell
npm test                 # full suite, list reporter
npm run test:headed      # visible browser
npm run test:ui          # Playwright UI runner
npm run test:line        # CI-friendly line reporter
```

The Playwright config (`playwright.config.ts`) launches both the .NET API
and the Vite dev server via the `webServer` array. On local dev runs it
reuses any servers already up; in CI it always starts fresh.

## Test data and fixtures

Every test gets a clean DB courtesy of the auto-use `cleanDb` fixture in
`fixtures/fixtures.ts`. That fixture hits two dev-only backend endpoints in
order:

1. `POST /api/dev/reset` — hard-deletes transactional rows and on-disk form
   image directories; preserves seeded Functions (Ids 1–6), seeded OrgUnits
   (Ids 1–3), and the SuperAdmin user `admin@local.com`.
2. `POST /api/dev/seed-test-users` — idempotently creates the role-matrix
   test users (all passwords `Test123!`):

   | Email | Role | OrgUnit |
   |---|---|---|
   | `admin@local.com` | SuperAdmin | — (kept from app startup seed) |
   | `admin@test` | Admin | none |
   | `localadmin1@test` | LocalAdmin | 1 (Belgrade) |
   | `localadmin2@test` | LocalAdmin | 3 (Novi Sad) |
   | `operator1@test` | Operator | 1 |
   | `operator2@test` | Operator | 1 |
   | `viewer1@test` | Viewer | 1 |

Both `/api/dev/*` endpoints return 404 unless `ASPNETCORE_ENVIRONMENT=Development`.

## Per-role API fixtures

`fixtures/fixtures.ts` exposes pre-authenticated `APIRequestContext` fixtures
for each canonical role: `superAdminApi`, `adminApi`, `localAdminApi`,
`operatorApi`, `viewerApi`. UI tests use the `loginAsUI(page, roleKey)`
helper instead.
