# Operator scope + Operator dashboard — design

**Date:** 2026-07-25
**Status:** Approved, pending implementation

## Problem

The `Operator` role sees more of the admin app than it should. Today an Operator's
sidebar shows **Members, Forms, Позивање (call queue), Profile**, and — because
several admin controllers are annotated only with `[Authorize(Policy = "ApiPolicy")]`
and no `Roles` — an Operator can reach `/api/members`, `/api/forms`,
`/api/committees`, and `/api/functions` directly regardless of what the UI hides.

Operators should be able to reach exactly three things: **their own dashboard, the
calling queue, and their profile**. They also have no dashboard at all right now
(`DASHBOARD_ROLES` excludes them), so there is nowhere to show them their own work.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Enforcement | **Backend + frontend.** Hiding nav alone is cosmetic. |
| Dashboard route | **Same `/dashboard`**, branches on role. No new route, no redirect changes. |
| Recent-calls list | The operator's own **recent call attempts** (contact, when, outcome). |
| Statistics | **Call counts** (today / last 7 days / total), **outcome breakdown**, **queue progress**. Not success-rate. |
| Week window | **Rolling last 7 days**, not calendar week — avoids week-start/timezone ambiguity. Labelled as such. |
| Municipalities | Operators **keep** `/api/municipalities` — the queue's filter depends on it. |
| Members/Forms | Operators lose both, UI and API. |

## Latent bug this fixes

`framework/private-route.jsx` redirects any role mismatch to `/dashboard`. Operators
are currently barred from `/dashboard`, so a stray or bookmarked URL bounces them
between the guard and the redirect target. Admitting Operators to `/dashboard`
resolves it; no change to `PrivateRoute` itself is needed.

## Accepted consequence

`pages/members/MemberCreate.jsx` reads `location.state?.callContactId` and calls
`callCenterApi.setConverted(...)` — a contact→member conversion path. **Nothing
navigates into it today** (only `FormUpload` and `MembersList` route to
`/members/new`, neither passing `callContactId`), so removing Operator access to
Members breaks no live flow. If that flow is later wired up from the call script,
Operators will need Members access carved back in.

## Access model

### Frontend — `src/client/MembershipAdmin/src/config.js`

Both the sidebar (`AppSidebar.jsx` filters `NAV_ITEMS` by role) and the routes
(`services/router.jsx` passes these arrays to `PrivateRoute`) are driven from
these constants, so the role arrays are the single lever:

- `DASHBOARD_ROLES` — **add** `Operator`
- `MEMBERS_ROLES` — **remove** `Operator`
- `FORMS_ROLES` — **remove** `Operator`
- `NAV_ITEMS` — **no edit needed**: every entry already references these constants
  by name (e.g. `{ to: '/dashboard', roles: DASHBOARD_ROLES, ... }`), so nav and
  routes both follow automatically. Operators reuse the existing Dashboard entry
  rather than getting a new one.
- The authorization-rules comment at the top of `config.js` (lines 3–10) documents
  the old per-route roles and must be updated to match, or it becomes a lie.

Resulting Operator nav: **Dashboard** (`main`) · **Позивање** (`callcenter`) ·
**Profile** (`account`).

### Backend — controller authorization

Add explicit `Roles` so Operators are refused at the API, not just in the UI:

| Controller | Current | New |
|---|---|---|
| `MembersController` | any authenticated | `SuperAdmin, Admin, LocalAdmin, Viewer` |
| `FormsController` | any authenticated | `SuperAdmin, Admin, LocalAdmin, Viewer` |
| `CommitteesController` | any authenticated | `SuperAdmin, Admin, LocalAdmin, Viewer` |
| `FunctionsController` | any authenticated | `SuperAdmin, Admin, LocalAdmin, Viewer` |
| `MunicipalitiesController` | any authenticated | **unchanged** (queue filter needs it) |
| `CallContactsController` | `SuperAdmin, Admin, Operator` | unchanged |
| `DashboardController` | `SuperAdmin, Admin, LocalAdmin` | unchanged |

Existing per-action `Roles` overrides (e.g. write actions restricted to `SuperAdmin`)
stay as they are — these are class-level additions only.

The new role lists are deliberately "every role except `Operator`". These four
controllers are currently open to any authenticated user, so listing the remaining
four roles preserves today's access for `Viewer` and `LocalAdmin` exactly and
changes behaviour **only** for `Operator`. This is intentionally not an attempt to
tighten those controllers generally — that would be a separate change.

## New endpoint: operator statistics

`GET /api/call-center/my-stats` — `[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,Operator")]`.

Always scoped to the **calling** user (`ICurrentUserContext.Id`); it takes no
operator-id parameter, so one operator can never read another's figures.

New `IOperatorStatsService` / `OperatorStatsService` in
`Marsipan.Membership.Middleware/Services/`. Kept separate from
`CallCenterReportService`, which is admin-wide, contact-level, and never touches
`CallAttempts` — different grain, different audience.

### Response — `OperatorStatsDto`

```csharp
public class OperatorStatsDto
{
    public int CallsToday { get; set; }
    public int CallsLast7Days { get; set; }
    public int CallsTotal { get; set; }
    public List<OutcomeCountDto> OutcomeBreakdown { get; set; } = new();
    public int QueueTotal { get; set; }      // contacts in this operator's pools
    public int QueueResolved { get; set; }   // of those, FinalStatus != null
    public List<RecentCallDto> RecentCalls { get; set; } = new();
}

public class OutcomeCountDto
{
    public CallOutcome Outcome { get; set; }
    public int Count { get; set; }
}

public class RecentCallDto
{
    public int CallContactId { get; set; }
    public string ContactName { get; set; } = string.Empty;  // "First Last"
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTime CalledAt { get; set; }
    public CallOutcome Outcome { get; set; }
}
```

### Data sources

- **Counts / breakdown / recent** — `_db.CallAttempts.Where(a => a.CalledByUserId == me)`.
  `CallAttempt` carries `CallContactId`, `Outcome`, `CalledByUserId`, `CalledAt`,
  `Note`; there is **no duration field**, hence no time-based stats.
- **Queue progress** — `_db.CallContacts.ApplyCallContactScope(_user)`, the existing
  filter that already restricts an Operator to contacts in pools they are assigned
  to via `CallPoolOperator`. `QueueTotal` = all in scope; `QueueResolved` = those
  with `FinalStatus != null`.
- **Recent calls** — newest first by `CalledAt`, capped at **10**, joined to
  `CallContact` for name and phone.

`CallsToday` = attempts with `CalledAt >= UtcNow.Date`. `CallsLast7Days` =
`CalledAt >= UtcNow.AddDays(-7)`.

## Frontend — Operator dashboard

`pages/dashboard/Dashboard.jsx` branches on `auth.getRole()`:

- `Operator` → renders the new `pages/dashboard/OperatorDashboard.jsx`
- everyone else → today's admin dashboard, untouched

`OperatorDashboard.jsx` calls `GET /api/call-center/my-stats` once and renders:

1. **Stat cards** — calls today, last 7 days, total (reuses the existing
   `DashboardCard` component).
2. **Outcome breakdown** — counts per `CallOutcome`, rendered as a labelled list
   with proportional bars. Outcome labels come from the existing `enums` locale
   namespace.
3. **Queue progress** — `QueueResolved / QueueTotal` with a progress bar.
4. **Recent calls** — a table of the last 10: contact name, phone, when, outcome.

New Serbian and English strings under the existing `dashboard` locale namespace.
No new namespace (that would require edits in three places in `framework/i18n.js`).

## Testing

Unit tests for `OperatorStatsService` (xUnit + EF InMemory, matching the existing
`Services/` test style):

- Attempts by a **different** operator are excluded from every count, from the
  outcome breakdown, and from the recent list.
- Outcome breakdown groups and counts correctly across several `CallOutcome` values.
- `CallsToday` / `CallsLast7Days` respect their cutoffs (an attempt 10 days old
  counts only toward `CallsTotal`).
- Queue progress honours pool scope: contacts in a pool the operator is **not**
  assigned to are excluded; `QueueResolved` counts only `FinalStatus != null`.
- Recent calls are newest-first and capped at 10.

Controller authorization changes are verified by review and a manual check that an
Operator token receives 403 from `/api/members` while still receiving 200 from
`/api/municipalities` and `/api/call-contacts`.

## Out of scope (YAGNI)

- Success/contact-rate percentage (explicitly not selected).
- Per-call duration tracking (`CallAttempt` has no duration field; adding one is a
  schema change and a separate feature).
- Admin-facing per-operator leaderboards or filtering the existing call-center
  report by operator.
- Reworking the dormant contact→member conversion flow.
