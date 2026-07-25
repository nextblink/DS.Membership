# Operator Scope + Operator Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict the `Operator` role to exactly three areas — their own dashboard, the calling queue, and their profile — and give them a dashboard showing their own recent calls and calling statistics.

**Architecture:** Frontend access is driven entirely by three role arrays in `config.js` (both the sidebar and the routes read them), so scoping the UI is a three-line change. The API is tightened separately by adding explicit `Roles` to four controllers that are currently open to any authenticated user. A new `OperatorStatsService` aggregates `CallAttempt` rows for the calling user, exposed at `GET /api/call-center/my-stats`, and the existing `/dashboard` page branches on role to render a new `OperatorDashboard` component.

**Tech Stack:** .NET 10, ASP.NET Core Identity, EF Core (SQL Server), xUnit + EF InMemory; React 19 + Vite + Tailwind v4, react-router-dom, i18next.

## Global Constraints

- Target framework `net10.0`; frontend is JavaScript `.jsx` (no TypeScript).
- Services live in `src/backend/Marsipan.Membership.Middleware/Services/`, DTOs in `.../DTOs/`, registered in `Program.cs` inside a `// --- Feature --- ... // --- end Feature ---` block.
- Every list/stat endpoint scopes by the **calling** user via `ICurrentUserContext`; `GET /api/call-center/my-stats` takes **no** operator-id parameter.
- Operator scoping of call contacts already exists as `ApplyCallContactScope` in `Services/ScopeFilters.cs` — reuse it, do not reimplement pool filtering.
- `CallsToday` = `CalledAt >= DateTime.UtcNow.Date`. `CallsLast7Days` = `CalledAt >= DateTime.UtcNow.AddDays(-7)` (rolling window, **not** calendar week).
- Recent calls: newest first by `CalledAt`, capped at **10**.
- Operators **keep** access to `/api/municipalities` (the queue's municipality filter calls it). They lose Members, Forms, Committees, Functions.
- The four controller role lists are "every role except `Operator`" — `SuperAdmin, Admin, LocalAdmin, Viewer` — preserving today's access for every other role.
- New UI strings go in the existing `dashboard` locale namespace (`src/client/MembershipAdmin/src/locales/{sr,en}/dashboard.json`). Do **not** add a new namespace (that needs three edits in `framework/i18n.js`).
- Outcome labels reuse the existing `enums:callOutcome.*` keys via `toEnumKey()` from `src/services/callScript.js`.
- Conventional commit prefixes (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).

---

### Task 1: Operator statistics service

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/DTOs/OperatorStatsDtos.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/IOperatorStatsService.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/OperatorStatsService.cs`
- Test: `src/backend/Marsipan.Membership.Tests/Services/OperatorStatsServiceTests.cs`

**Interfaces:**
- Consumes: `ApplicationContext` (`_db.CallAttempts`, `_db.CallContacts`), `ICurrentUserContext` (`.Id`, `.Role`, `.CommitteeId`, `.IsAuthenticated`), and `ScopeFilters.ApplyCallContactScope(IQueryable<CallContact>, ICurrentUserContext)`.
- Produces:
  - `interface IOperatorStatsService { Task<OperatorStatsDto> GetMyStatsAsync(CancellationToken ct); }`
  - `OperatorStatsDto` with `int CallsToday`, `int CallsLast7Days`, `int CallsTotal`, `List<OutcomeCountDto> OutcomeBreakdown`, `int QueueTotal`, `int QueueResolved`, `List<RecentCallDto> RecentCalls`.
  - `OutcomeCountDto { CallOutcome Outcome; int Count; }`
  - `RecentCallDto { int CallContactId; string ContactName; string PhoneNumber; DateTime CalledAt; CallOutcome Outcome; }`

Reference — the entity this reads (already exists, do not modify):

```csharp
public class CallAttempt : BaseEntity   // BaseEntity: Id, CreatedDate, LastModifiedDate, CreatedByUserId, LastModifiedByUserId, IsDeleted
{
    public int CallContactId { get; set; }
    public CallContact CallContact { get; set; } = null!;
    public CallOutcome Outcome { get; set; }        // ValidContact, WrongNumber, NotInService, NoAnswer, Refused
    public string CalledByUserId { get; set; } = null!;
    public DateTime CalledAt { get; set; }
    public string? Note { get; set; }
}
```

- [ ] **Step 1: Create the DTOs**

`src/backend/Marsipan.Membership.Middleware/DTOs/OperatorStatsDtos.cs`:

```csharp
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// One operator's own calling figures, returned by
/// <c>GET /api/call-center/my-stats</c>. Always about the calling user —
/// there is no operator-id parameter anywhere in this flow.
/// </summary>
public class OperatorStatsDto
{
    public int CallsToday { get; set; }
    public int CallsLast7Days { get; set; }
    public int CallsTotal { get; set; }

    public List<OutcomeCountDto> OutcomeBreakdown { get; set; } = new();

    /// <summary>Contacts in the pools this operator is assigned to.</summary>
    public int QueueTotal { get; set; }

    /// <summary>Of <see cref="QueueTotal"/>, those with a final status set.</summary>
    public int QueueResolved { get; set; }

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
    public string ContactName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTime CalledAt { get; set; }
    public CallOutcome Outcome { get; set; }
}
```

- [ ] **Step 2: Create the interface**

`src/backend/Marsipan.Membership.Middleware/Services/IOperatorStatsService.cs`:

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Per-operator calling statistics, scoped to the current user. Distinct from
/// <see cref="ICallCenterReportService"/>, which reports campaign-wide,
/// contact-level figures for admins and never reads call attempts.
/// </summary>
public interface IOperatorStatsService
{
    Task<OperatorStatsDto> GetMyStatsAsync(CancellationToken ct);
}
```

- [ ] **Step 3: Write the failing tests**

`src/backend/Marsipan.Membership.Tests/Services/OperatorStatsServiceTests.cs`:

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class StatsUser : ICurrentUserContext
{
    public string? Id { get; init; }
    public string? Role { get; init; }
    public int? CommitteeId { get; init; }
    public bool IsAuthenticated { get; init; } = true;
}

public class OperatorStatsServiceTests
{
    private const string Me = "operator-me";
    private const string Other = "operator-other";

    private static ApplicationContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<ApplicationContext>().UseInMemoryDatabase(name).Options);

    private static OperatorStatsService BuildService(ApplicationContext db, string userId = Me) =>
        new(db, new StatsUser { Id = userId, Role = ScopeFilters.RoleOperator });

    // Creates a pool the given operator is assigned to, plus a contact in it.
    // NOTE: CallPool, CallPoolOperator and CallContact all derive from
    // BaseEntity, whose CreatedByUserId / LastModifiedByUserId are
    // non-nullable — the InMemory provider rejects SaveChanges if they are
    // left unset, so every seeded row sets them.
    private static async Task<CallContact> SeedPooledContactAsync(
        ApplicationContext db, string operatorUserId, string firstName,
        ContactFinalStatus? finalStatus = null)
    {
        var campaign = new Campaign
        {
            Name = "Camp-" + firstName,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        var pool = new CallPool
        {
            Name = "P-" + firstName,
            CampaignId = campaign.Id,   // [Required] on CallPool
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.CallPools.Add(pool);
        await db.SaveChangesAsync();

        db.CallPoolOperators.Add(new CallPoolOperator
        {
            CallPoolId = pool.Id,
            UserId = operatorUserId,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        });

        var contact = new CallContact
        {
            FirstName = firstName,
            LastName = "Test",
            PhoneNumber = "060" + firstName,
            PoolId = pool.Id,
            FinalStatus = finalStatus,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.CallContacts.Add(contact);
        await db.SaveChangesAsync();
        return contact;
    }

    private static void AddAttempt(
        ApplicationContext db, int contactId, string userId, CallOutcome outcome, DateTime calledAt)
    {
        db.CallAttempts.Add(new CallAttempt
        {
            CallContactId = contactId,
            CalledByUserId = userId,
            Outcome = outcome,
            CalledAt = calledAt,
            // BaseEntity audit fields are non-nullable — must be set.
            CreatedByUserId = userId,
            LastModifiedByUserId = userId,
        });
    }

    [Fact]
    public async Task GetMyStatsAsync_CountsOnlyMyAttempts_AcrossTimeWindows()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_CountsOnlyMyAttempts_AcrossTimeWindows));
        var contact = await SeedPooledContactAsync(db, Me, "A");
        var now = DateTime.UtcNow;

        AddAttempt(db, contact.Id, Me, CallOutcome.ValidContact, now.AddMinutes(-5));   // today
        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now.AddDays(-3));          // last 7 days
        AddAttempt(db, contact.Id, Me, CallOutcome.Refused, now.AddDays(-10));          // total only
        AddAttempt(db, contact.Id, Other, CallOutcome.ValidContact, now.AddMinutes(-5)); // someone else
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(1, stats.CallsToday);
        Assert.Equal(2, stats.CallsLast7Days);
        Assert.Equal(3, stats.CallsTotal);
    }

    [Fact]
    public async Task GetMyStatsAsync_OutcomeBreakdown_GroupsMyAttemptsOnly()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_OutcomeBreakdown_GroupsMyAttemptsOnly));
        var contact = await SeedPooledContactAsync(db, Me, "B");
        var now = DateTime.UtcNow;

        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now);
        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now);
        AddAttempt(db, contact.Id, Me, CallOutcome.ValidContact, now);
        AddAttempt(db, contact.Id, Other, CallOutcome.Refused, now);
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(2, stats.OutcomeBreakdown.Single(o => o.Outcome == CallOutcome.NoAnswer).Count);
        Assert.Equal(1, stats.OutcomeBreakdown.Single(o => o.Outcome == CallOutcome.ValidContact).Count);
        Assert.DoesNotContain(stats.OutcomeBreakdown, o => o.Outcome == CallOutcome.Refused);
    }

    [Fact]
    public async Task GetMyStatsAsync_QueueProgress_HonoursPoolScope()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_QueueProgress_HonoursPoolScope));
        await SeedPooledContactAsync(db, Me, "C1");                                       // mine, unresolved
        await SeedPooledContactAsync(db, Me, "C2", ContactFinalStatus.ActiveMember);       // mine, resolved
        await SeedPooledContactAsync(db, Other, "C3");                                     // not my pool
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(2, stats.QueueTotal);
        Assert.Equal(1, stats.QueueResolved);
    }

    [Fact]
    public async Task GetMyStatsAsync_RecentCalls_NewestFirst_CappedAtTen_AndMineOnly()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_RecentCalls_NewestFirst_CappedAtTen_AndMineOnly));
        var contact = await SeedPooledContactAsync(db, Me, "D");
        var now = DateTime.UtcNow;

        // 12 of mine, oldest first, so the newest has the smallest offset.
        for (var i = 12; i >= 1; i--)
            AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now.AddMinutes(-i));
        AddAttempt(db, contact.Id, Other, CallOutcome.ValidContact, now);
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(10, stats.RecentCalls.Count);
        Assert.All(stats.RecentCalls, r => Assert.Equal(CallOutcome.NoAnswer, r.Outcome));
        Assert.True(stats.RecentCalls[0].CalledAt >= stats.RecentCalls[1].CalledAt);
        Assert.Equal("D Test", stats.RecentCalls[0].ContactName);
        Assert.Equal("060D", stats.RecentCalls[0].PhoneNumber);
        Assert.Equal(contact.Id, stats.RecentCalls[0].CallContactId);
    }
}
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter OperatorStatsServiceTests`
Expected: FAIL — `OperatorStatsService` does not exist (compile error).

- [ ] **Step 5: Implement the service**

`src/backend/Marsipan.Membership.Middleware/Services/OperatorStatsService.cs`:

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <inheritdoc />
public class OperatorStatsService : IOperatorStatsService
{
    private const int RecentCallsLimit = 10;

    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public OperatorStatsService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<OperatorStatsDto> GetMyStatsAsync(CancellationToken ct)
    {
        var userId = _user.Id;
        if (string.IsNullOrEmpty(userId))
            return new OperatorStatsDto();

        var now = DateTime.UtcNow;
        var todayCutoff = now.Date;
        var weekCutoff = now.AddDays(-7);

        // Attempts are the only per-operator record we keep; CallContact tracks
        // the claim, not who ultimately called.
        var mine = _db.CallAttempts.AsNoTracking().Where(a => a.CalledByUserId == userId);

        var callsTotal = await mine.CountAsync(ct);
        var callsToday = await mine.CountAsync(a => a.CalledAt >= todayCutoff, ct);
        var callsLast7Days = await mine.CountAsync(a => a.CalledAt >= weekCutoff, ct);

        var outcomeBreakdown = await mine
            .GroupBy(a => a.Outcome)
            .Select(g => new OutcomeCountDto { Outcome = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Reuses the existing role-aware filter: for an Operator this is exactly
        // the contacts in the pools they are assigned to.
        var scoped = _db.CallContacts.AsNoTracking().ApplyCallContactScope(_user);
        var queueTotal = await scoped.CountAsync(ct);
        var queueResolved = await scoped.CountAsync(c => c.FinalStatus != null, ct);

        var recentCalls = await mine
            .OrderByDescending(a => a.CalledAt)
            .Take(RecentCallsLimit)
            .Select(a => new RecentCallDto
            {
                CallContactId = a.CallContactId,
                ContactName = (a.CallContact.FirstName + " " + a.CallContact.LastName).Trim(),
                PhoneNumber = a.CallContact.PhoneNumber,
                CalledAt = a.CalledAt,
                Outcome = a.Outcome,
            })
            .ToListAsync(ct);

        return new OperatorStatsDto
        {
            CallsToday = callsToday,
            CallsLast7Days = callsLast7Days,
            CallsTotal = callsTotal,
            OutcomeBreakdown = outcomeBreakdown,
            QueueTotal = queueTotal,
            QueueResolved = queueResolved,
            RecentCalls = recentCalls,
        };
    }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter OperatorStatsServiceTests`
Expected: PASS (4 tests).

If a test fails because `ScopeFilters.ApplyCallContactScope` needs the `Pool.Operators` navigation loaded, check `ScopeFilters.cs` — the filter is
`q.Where(c => c.PoolId != null && c.Pool!.Operators.Any(o => o.UserId == userId))`, which the InMemory provider resolves from the seeded `CallPoolOperator` rows. Make sure the test seeds `CallPoolOperators` (it does) and that `SaveChangesAsync` ran before querying.

- [ ] **Step 7: Run the full test project**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/OperatorStatsDtos.cs \
        src/backend/Marsipan.Membership.Middleware/Services/IOperatorStatsService.cs \
        src/backend/Marsipan.Membership.Middleware/Services/OperatorStatsService.cs \
        src/backend/Marsipan.Membership.Tests/Services/OperatorStatsServiceTests.cs
git commit -m "feat: add per-operator calling statistics service"
```

---

### Task 2: Expose the stats endpoint and tighten controller roles

**Files:**
- Create: `src/backend/Marsipan.Membership.Web/Controllers/Admin/OperatorStatsController.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs` (DI registration)
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/MembersController.cs:16`
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs:16`
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/CommitteesController.cs:13`
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/FunctionsController.cs:14`

**Interfaces:**
- Consumes: `IOperatorStatsService.GetMyStatsAsync(CancellationToken)` and `OperatorStatsDto` (Task 1).
- Produces: `GET /api/call-center/my-stats` returning `OperatorStatsDto` (200) for roles `SuperAdmin, Admin, Operator`.

- [ ] **Step 1: Create the controller**

`src/backend/Marsipan.Membership.Web/Controllers/Admin/OperatorStatsController.cs`:

```csharp
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// An operator's own calling statistics. Always scoped to the caller — there is
/// deliberately no operator-id parameter, so one operator cannot read another's
/// figures.
/// </summary>
[ApiController]
[Route("api/call-center")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,Operator")]
public class OperatorStatsController : ControllerBase
{
    private readonly IOperatorStatsService _statsService;

    public OperatorStatsController(IOperatorStatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet("my-stats")]
    [ProducesResponseType(typeof(OperatorStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OperatorStatsDto>> MyStats(CancellationToken ct)
    {
        var stats = await _statsService.GetMyStatsAsync(ct);
        return Ok(stats);
    }
}
```

- [ ] **Step 2: Register the service in Program.cs**

In `src/backend/Marsipan.Membership.Web/Program.cs`, find the block:

```csharp
// --- Campaigns (call center) ---
```

and add this line immediately before its `// --- end Campaigns ---` line:

```csharp
builder.Services.AddScoped<IOperatorStatsService, OperatorStatsService>();
```

- [ ] **Step 3: Restrict the four controllers**

Replace the class-level attribute in each file. In every case the line currently reads exactly:

```csharp
[Authorize(Policy = "ApiPolicy")]
```

Replace it with:

```csharp
// Every role except Operator — Operators are limited to their dashboard, the
// call queue, and their profile. This preserves existing access for all other
// roles rather than tightening these endpoints generally.
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,LocalAdmin,Viewer")]
```

Apply to all four:
- `Controllers/Admin/MembersController.cs` (line 16)
- `Controllers/Admin/FormsController.cs` (line 16)
- `Controllers/Admin/CommitteesController.cs` (line 13)
- `Controllers/Admin/FunctionsController.cs` (line 14)

Do **not** touch `MunicipalitiesController.cs` — the call queue's municipality filter calls `/api/municipalities` and Operators must keep it. Do not change any per-action `[Authorize]` overrides inside these files.

- [ ] **Step 4: Build the solution**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

If the build fails with a file lock on `Marsipan.Membership.Web.dll`, a dev instance of the app is running — stop it and rebuild.

- [ ] **Step 5: Verify the endpoint and the lockdown manually**

Start the API:

```bash
cd src/backend/Marsipan.Membership.Web
ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5152"
```

In another shell, log in as the dev SuperAdmin and confirm the new endpoint answers:

```bash
TOKEN=$(curl -s http://localhost:5152/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@local.com","password":"Admin123!"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s -o /dev/null -w "my-stats=%{http_code}\n" http://localhost:5152/api/call-center/my-stats -H "Authorization: Bearer $TOKEN"
```

Expected: `my-stats=200`.

Then confirm an **Operator** token is refused by the restricted controllers but still allowed where it must be. Create an operator user and set its password (adapt the email if it already exists):

```bash
curl -s -X POST http://localhost:5152/api/users -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"op-check@example.com","firstName":"Op","lastName":"Check","role":"Operator","committeeId":1}'
```

That emails a set-password link to `src/backend/Marsipan.Membership.Web/wwwroot/mail-pickup/`. Open the newest `.eml`, extract the `token` and `email` query params from the `reset-password` URL, then:

```bash
curl -s -o /dev/null -w "reset=%{http_code}\n" http://localhost:5152/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"op-check@example.com","token":"<TOKEN_FROM_EML>","newPassword":"OpPass123"}'
OP=$(curl -s http://localhost:5152/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"op-check@example.com","password":"OpPass123"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
for p in members forms committees functions municipalities call-contacts/my-pools call-center/my-stats; do
  printf "%-28s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:5152/api/$p" -H "Authorization: Bearer $OP")"
done
```

Expected: `members`, `forms`, `committees`, `functions` → **403**; `municipalities`, `call-contacts/my-pools`, `call-center/my-stats` → **200**.

Record the actual output in your report. Stop the API when done.

- [ ] **Step 6: Commit**

```bash
git add src/backend/Marsipan.Membership.Web/Controllers/Admin/OperatorStatsController.cs \
        src/backend/Marsipan.Membership.Web/Program.cs \
        src/backend/Marsipan.Membership.Web/Controllers/Admin/MembersController.cs \
        src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs \
        src/backend/Marsipan.Membership.Web/Controllers/Admin/CommitteesController.cs \
        src/backend/Marsipan.Membership.Web/Controllers/Admin/FunctionsController.cs
git commit -m "feat: add operator stats endpoint and bar Operators from admin APIs"
```

---

### Task 3: Frontend role scoping

**Files:**
- Modify: `src/client/MembershipAdmin/src/config.js:3-10` (header comment), `:23-25` (role arrays)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `DASHBOARD_ROLES` includes `Operator`; `MEMBERS_ROLES` and `FORMS_ROLES` exclude it. Both `AppSidebar.jsx` (filters `NAV_ITEMS`) and `services/router.jsx` (passes these arrays to `PrivateRoute`) read them, so no edit is needed in either file.

- [ ] **Step 1: Update the role arrays**

In `src/client/MembershipAdmin/src/config.js`, replace lines 23-25. They currently read:

```js
export const DASHBOARD_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin]
export const MEMBERS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator, ROLES.Viewer]
export const FORMS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator]
```

Replace with:

```js
export const DASHBOARD_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Operator]
export const MEMBERS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin, ROLES.Viewer]
export const FORMS_ROLES = [ROLES.SuperAdmin, ROLES.Admin, ROLES.LocalAdmin]
```

- [ ] **Step 2: Update the stale rules comment**

In the same file, replace the comment block at lines 3-10, which currently reads:

```js
// Per spec (Authorization Rules Summary):
//   /dashboard               → SuperAdmin, Admin, LocalAdmin
//   /members, /members/*     → SuperAdmin, Admin, LocalAdmin, Operator, Viewer
//   /forms, /forms/*         → SuperAdmin, Admin, LocalAdmin, Operator
//   /committees              → SuperAdmin only
//   /functions               → SuperAdmin only
//   /users                   → SuperAdmin only
//   /profile                 → all roles
```

with:

```js
// Authorization rules:
//   /dashboard               → SuperAdmin, Admin, LocalAdmin, Operator
//                              (Operators get their own view — see OperatorDashboard)
//   /members, /members/*     → SuperAdmin, Admin, LocalAdmin, Viewer
//   /forms, /forms/*         → SuperAdmin, Admin, LocalAdmin
//   /committees              → SuperAdmin only
//   /functions               → SuperAdmin only
//   /users                   → SuperAdmin only
//   /callcenter/queue        → SuperAdmin, Admin, Operator
//   /profile                 → all roles
//
// Operators are limited to the dashboard, the call queue, and their profile.
// The API enforces the same limits — hiding nav alone would be cosmetic.
```

- [ ] **Step 3: Build the frontend**

Run: `cd src/client/MembershipAdmin && npm run build`
Expected: build succeeds.

The build auto-bumps `package.json`'s version. Revert that before committing so the commit stays focused: `git checkout -- src/client/MembershipAdmin/package.json`

- [ ] **Step 4: Commit**

```bash
git add src/client/MembershipAdmin/src/config.js
git commit -m "feat: limit Operator nav and routes to dashboard, queue and profile"
```

---

### Task 4: Operator dashboard UI

**Files:**
- Create: `src/client/MembershipAdmin/src/pages/dashboard/OperatorDashboard.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx` (role branch)
- Modify: `src/client/MembershipAdmin/src/locales/sr/dashboard.json`
- Modify: `src/client/MembershipAdmin/src/locales/en/dashboard.json`

**Interfaces:**
- Consumes: `GET /api/call-center/my-stats` → `OperatorStatsDto` (Task 2), serialized camelCase: `{ callsToday, callsLast7Days, callsTotal, outcomeBreakdown: [{ outcome, count }], queueTotal, queueResolved, recentCalls: [{ callContactId, contactName, phoneNumber, calledAt, outcome }] }`. `outcome` arrives as a PascalCase string (e.g. `"ValidContact"`) because the API registers `JsonStringEnumConverter`.
- Produces: nothing consumed by later tasks.

Reference — existing helpers this reuses:
- `DashboardCard` (`./DashboardCard`), props: `{ accent, delay, to, stats: [{value, label}], right, icon }`.
- `toEnumKey` from `../../services/callScript` — converts `"ValidContact"` → `"validContact"` for the `enums:callOutcome.*` locale keys.
- `formatDateTime`-style helpers are **not** assumed; use `new Date(x).toLocaleString('sr-RS')`.

- [ ] **Step 1: Add the Serbian locale strings**

In `src/client/MembershipAdmin/src/locales/sr/dashboard.json`, add this key at the top level of the root object (mind the comma on the preceding key):

```json
  "operator": {
    "title": "Мој преглед",
    "callsToday": "Позива данас",
    "callsLast7Days": "Позива (7 дана)",
    "callsTotal": "Укупно позива",
    "queueTitle": "Напредак у групама",
    "queueProgress": "{{resolved}} од {{total}} решено",
    "queueEmpty": "Нема додељених контаката",
    "outcomeTitle": "Исходи позива",
    "outcomeEmpty": "Још нема позива",
    "recentTitle": "Последњи позиви",
    "recentEmpty": "Још нема позива",
    "colContact": "Контакт",
    "colPhone": "Телефон",
    "colWhen": "Време",
    "colOutcome": "Исход"
  }
```

- [ ] **Step 2: Add the English locale strings**

In `src/client/MembershipAdmin/src/locales/en/dashboard.json`, add the mirror key:

```json
  "operator": {
    "title": "My overview",
    "callsToday": "Calls today",
    "callsLast7Days": "Calls (7 days)",
    "callsTotal": "Calls total",
    "queueTitle": "Queue progress",
    "queueProgress": "{{resolved}} of {{total}} resolved",
    "queueEmpty": "No contacts assigned",
    "outcomeTitle": "Call outcomes",
    "outcomeEmpty": "No calls yet",
    "recentTitle": "Recent calls",
    "recentEmpty": "No calls yet",
    "colContact": "Contact",
    "colPhone": "Phone",
    "colWhen": "When",
    "colOutcome": "Outcome"
  }
```

- [ ] **Step 3: Create the OperatorDashboard component**

`src/client/MembershipAdmin/src/pages/dashboard/OperatorDashboard.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { toEnumKey } from '../../services/callScript'
import DashboardCard from './DashboardCard'

const PANEL =
  'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-5'

export default function OperatorDashboard() {
  const { t } = useTranslation(['dashboard', 'enums', 'common'])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/call-center/my-stats')
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || err?.message || t('dashboard:error.loadFailed'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${PANEL} h-24 animate-pulse`} />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-500">{error}</p>

  const outcomes = stats?.outcomeBreakdown ?? []
  const recent = stats?.recentCalls ?? []
  const queueTotal = stats?.queueTotal ?? 0
  const queueResolved = stats?.queueResolved ?? 0
  const queuePct = queueTotal > 0 ? Math.round((queueResolved / queueTotal) * 100) : 0
  const outcomeMax = outcomes.reduce((m, o) => Math.max(m, o.count), 0)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        {t('dashboard:operator.title')}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard
          accent="#2E6BAD"
          delay="0ms"
          stats={[{ value: stats?.callsToday ?? 0, label: t('dashboard:operator.callsToday') }]}
        />
        <DashboardCard
          accent="#7C3AED"
          delay="60ms"
          stats={[{ value: stats?.callsLast7Days ?? 0, label: t('dashboard:operator.callsLast7Days') }]}
        />
        <DashboardCard
          accent="#059669"
          delay="120ms"
          stats={[{ value: stats?.callsTotal ?? 0, label: t('dashboard:operator.callsTotal') }]}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Queue progress */}
        <div className={`${PANEL} xl:col-span-5`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('dashboard:operator.queueTitle')}
          </h2>
          {queueTotal === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard:operator.queueEmpty')}</p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t('dashboard:operator.queueProgress', { resolved: queueResolved, total: queueTotal })}
                </span>
                <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{queuePct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${queuePct}%` }} />
              </div>
            </>
          )}
        </div>

        {/* Outcome breakdown */}
        <div className={`${PANEL} xl:col-span-7`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('dashboard:operator.outcomeTitle')}
          </h2>
          {outcomes.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard:operator.outcomeEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {outcomes.map((o) => (
                <li key={o.outcome} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs text-gray-600 dark:text-gray-300">
                    {t(`enums:callOutcome.${toEnumKey(o.outcome)}`, o.outcome)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: outcomeMax > 0 ? `${(o.count / outcomeMax) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                    {o.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent calls */}
      <div className={`${PANEL} mt-5`}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t('dashboard:operator.recentTitle')}
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">{t('dashboard:operator.recentEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colContact')}</th>
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colPhone')}</th>
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colWhen')}</th>
                  <th className="pb-2 font-semibold">{t('dashboard:operator.colOutcome')}</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-200">
                {recent.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4">{r.contactName}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.phoneNumber}</td>
                    <td className="py-2 pr-4 tabular-nums">{new Date(r.calledAt).toLocaleString('sr-RS')}</td>
                    <td className="py-2">{t(`enums:callOutcome.${toEnumKey(r.outcome)}`, r.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Branch the Dashboard page on role**

In `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`:

Add these imports below the existing `import GenderPie from './GenderPie'` line:

```jsx
import auth from '../../framework/auth'
import { ROLES } from '../../config'
import OperatorDashboard from './OperatorDashboard'
```

Then split the component in two. **Do not** put an early `return` inside the existing function body — this project runs `eslint-plugin-react-hooks` (see `eslint.config.js`), and returning before `useTranslation`/`useState`/`useEffect` is reported as "React Hook is called conditionally". Instead, rename the existing component and add a branching wrapper that calls no hooks of its own.

Change the existing declaration on line 64 from:

```jsx
export default function Dashboard() {
```

to:

```jsx
function AdminDashboard() {
```

Leave that entire function body exactly as it is. Then add this new default export at the **end** of the file, after the closing brace of `AdminDashboard`:

```jsx
/**
 * Operators get their own view — they are not authorized for
 * /api/dashboard/stats, so the admin dashboard must never mount for them.
 * The branch lives in this wrapper (which calls no hooks) rather than as an
 * early return inside AdminDashboard, which would trip the rules-of-hooks lint.
 */
export default function Dashboard() {
  if (auth.getRole() === ROLES.Operator) return <OperatorDashboard />
  return <AdminDashboard />
}
```

- [ ] **Step 5: Lint the frontend**

Run: `cd src/client/MembershipAdmin && npm run lint`
Expected: no new errors from the files you touched. (Pre-existing warnings elsewhere in the repo are not yours to fix.)

- [ ] **Step 6: Build the frontend**

Run: `cd src/client/MembershipAdmin && npm run build`
Expected: build succeeds with no unresolved imports.

Revert the auto version bump: `git checkout -- src/client/MembershipAdmin/package.json`

- [ ] **Step 7: Verify the JSON is still valid**

Run:
```bash
cd src/client/MembershipAdmin && python -c "
import json,io
for lang in ['sr','en']:
    d=json.load(io.open(f'src/locales/{lang}/dashboard.json',encoding='utf-8-sig'))
    assert 'operator' in d, lang
    print(lang,'ok',len(d['operator']),'operator keys')
"
```
Expected: `sr ok 14 operator keys` and `en ok 14 operator keys`.

- [ ] **Step 8: Commit**

```bash
git add src/client/MembershipAdmin/src/pages/dashboard/OperatorDashboard.jsx \
        src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx \
        src/client/MembershipAdmin/src/locales/sr/dashboard.json \
        src/client/MembershipAdmin/src/locales/en/dashboard.json
git commit -m "feat: add operator dashboard with own call stats and recent calls"
```

---

### Task 5: End-to-end verification

**Files:** none (manual verification).

- [ ] **Step 1: Start both servers**

```bash
cd src/backend/Marsipan.Membership.Web && ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5152;https://localhost:7231" &
cd src/client/MembershipAdmin && npm run dev &
```

Wait for `http://localhost:5152/health` to return `200` and `http://localhost:5185/` to return `200`.

- [ ] **Step 2: Seed a couple of call attempts for an operator**

Log in as the operator created in Task 2 (`op-check@example.com` / `OpPass123`) in the browser at `http://localhost:5185`, go to **Позивање**, claim a contact and save an outcome so there is at least one `CallAttempt` for them. If the operator has no pool assigned, log in as SuperAdmin first and assign them to a pool under **Групе**.

- [ ] **Step 3: Check the Operator's view**

While logged in as the operator, confirm:
- The sidebar shows only **Dashboard**, **Позивање**, and **Profile** — no Members, Forms, Committees, Bodies, Functions, Users, or call-center admin entries.
- `/dashboard` renders the operator view: three stat cards, queue progress, outcome breakdown, and the recent-calls table containing the call logged in Step 2.
- Manually navigating to `http://localhost:5185/members` redirects back to `/dashboard` and does **not** loop.

- [ ] **Step 4: Check the admin view is unchanged**

Log out, log in as `admin@local.com`, and confirm `/dashboard` still shows the original admin dashboard (member/committee/forms cards, committees table, forms donut) and the full sidebar.

- [ ] **Step 5: Run the full backend suite**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj`
Expected: all PASS.

- [ ] **Step 6: Report**

Summarize what was verified: the operator's three-item sidebar, the operator dashboard rendering real figures, the `/members` redirect not looping, the admin dashboard unchanged, the API status codes recorded in Task 2 Step 5, and the test count.
