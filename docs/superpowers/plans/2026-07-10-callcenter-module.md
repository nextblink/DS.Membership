# Call Center Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a call-center module to the Membership app: import lead lists into campaigns, assign filtered pools to operators, drive a guided 7-step call script, and either enroll a lead as a new `Member` or link it to an existing one — plus a 13-metric reports view.

**Architecture:** Follows the existing NextBlink Middleware + Web split and the Services + DTOs (no Repository) layering. New EF entities + one migration, six services with `I<Service>` interfaces talking to `ApplicationContext` directly, four `ApiController`s under `api/<resource>` with `[Authorize(Policy = "ApiPolicy")]`, and a React/JSX client area mirroring the `members`/`events` page conventions. Call-script answers are stored as flat typed columns on `CallContact` (+ one child table for multi-select engagement areas and one for per-dial attempts), so all reports are simple `GROUP BY`.

**Tech Stack:** .NET 10, EF Core 10 (SQL Server), ASP.NET Core Identity roles, CsvHelper + ClosedXML (new) for import, React 18 + Vite + JS `.jsx` + Tailwind v3 + TailAdmin, axios, react-router-dom.

## Global Constraints

- **DbContext type name is `ApplicationContext`** (not `AppDbContext`). Inject as `ApplicationContext _db`.
- **Roles:** `SuperAdmin`, `Admin`, `LocalAdmin`, `Operator`, `Viewer`. Precedence + scope rules live in `Middleware/Services/ScopeFilters.cs`.
- **All new entities extend `BaseEntity`** (`Id`, `CreatedDate`, `LastModifiedDate`, `CreatedByUserId`, `LastModifiedByUserId`, `IsDeleted`). Set audit fields on every insert/update: `now = DateTime.UtcNow`, `CreatedByUserId`/`LastModifiedByUserId` = current user id string.
- **Soft delete:** aggregate roots get `modelBuilder.Entity<T>().HasQueryFilter(e => !e.IsDeleted)`. Child/join tables (attempts, engagement areas, pool-operators) do NOT get their own filter — they ride with the parent.
- **FK delete behavior:** use `DeleteBehavior.Restrict` (or `NoAction` to break cycles) for every FK to `Member`, `Committee`, `Municipality`, `ApplicationUser`, `Campaign`, `CallPool`. Never cascade into seeded aggregates. SQL Server rejects multiple cascade paths, so default to `Restrict`.
- **Pagination envelope:** every list endpoint returns `PagedResultDto<T>` = `{ items, totalCount, page, pageSize, totalPages }`. Default `page=1`, `pageSize=20`.
- **Routes:** `api/<resource>` kebab where multi-word (`api/campaigns`, `api/call-contacts`, `api/call-pools`, `api/call-center/reports`). Controllers carry `[ApiController]`, `[Route("api/...")]`, `[Authorize(Policy = "ApiPolicy")]`; endpoint-level role limits via `[Authorize(Roles = "SuperAdmin,Admin")]` etc.
- **Conflicts** throw `ConflictException` (in `Middleware/Services/`), caught in the controller → `Conflict(new { error = ex.Message })`. Not-found throws `KeyNotFoundException` → controller maps to `NotFound()`.
- **DTOs are C# `record`s** in `Middleware/DTOs/`, one file per aggregate.
- **EF migrations only** (no manual SQL). Migration command:
  ```powershell
  dotnet ef migrations add <Name> --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Web
  ```
  Apply:
  ```powershell
  dotnet ef database update --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Web
  ```
- **Build check** (run from repo root): `dotnet build src/backend/Marsipan.Membership.sln`.
- **No backend test project exists** for Middleware/Web. Verification for backend tasks = build succeeds + migration applies + manual endpoint check. Frontend = `npm run build` (from `src/client/MembershipAdmin`) + manual UI check.
- **Conventional commits**, reference issue numbers where applicable, branch `issue/<n>-<slug>`.

---

## File Structure

**Backend — `src/backend/Marsipan.Membership.Middleware/`**
- `Enums/Enums.cs` (MODIFY) — append 5 call-center enums.
- `Entities/Campaign.cs`, `CallContact.cs`, `CallAttempt.cs`, `ContactEngagementArea.cs`, `CallPool.cs`, `CallPoolOperator.cs` (CREATE).
- `Data/ApplicationContext.cs` (MODIFY) — 6 DbSets + relationship/index config + query filters.
- `Migrations/` (CREATE via CLI) — one migration `AddCallCenter`.
- `DTOs/CampaignDtos.cs`, `CallContactDtos.cs`, `CallPoolDtos.cs`, `CallCenterReportDtos.cs` (CREATE).
- `Services/ScopeFilters.cs` (MODIFY) — add `ApplyCallContactScope`.
- `Services/ICampaignService.cs` + `CampaignService.cs` (CREATE).
- `Services/ICallContactImportService.cs` + `CallContactImportService.cs` (CREATE).
- `Services/ICallPoolService.cs` + `CallPoolService.cs` (CREATE).
- `Services/ICallContactService.cs` + `CallContactService.cs` (CREATE).
- `Services/ICallCenterReportService.cs` + `CallCenterReportService.cs` (CREATE).
- `Marsipan.Membership.Middleware.csproj` (MODIFY) — add CsvHelper + ClosedXML.

**Backend — `src/backend/Marsipan.Membership.Web/`**
- `Controllers/Admin/CampaignsController.cs`, `CallContactsController.cs`, `CallPoolsController.cs`, `CallCenterReportsController.cs` (CREATE).
- `Program.cs` (MODIFY) — register 5 services.

**Frontend — `src/client/MembershipAdmin/src/`**
- `config.js` (MODIFY) — role arrays for call-center routes.
- `framework/api.js` — no change (shared axios instance).
- `services/callCenterApi.js` (CREATE) — API wrappers.
- `services/callScript.js` (CREATE) — conditional-step logic (pure, testable).
- `services/router.jsx` (MODIFY) — routes.
- `components/*Sidebar*` (MODIFY) — nav entries.
- `pages/callcenter/CampaignList.jsx`, `CampaignForm.jsx`, `ContactImport.jsx`, `ContactList.jsx`, `PoolList.jsx`, `PoolForm.jsx`, `CallQueue.jsx`, `CallScript.jsx`, `CallCenterReports.jsx` (CREATE).

---

## Task 1: Enums + entities

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Entities/Campaign.cs`, `CallContact.cs`, `CallAttempt.cs`, `ContactEngagementArea.cs`, `CallPool.cs`, `CallPoolOperator.cs`

**Interfaces:**
- Produces: enums `CallOutcome`, `PartyRelation`, `ActivityLevel`, `EngagementArea`, `ContactFinalStatus`; entities `Campaign`, `CallContact`, `CallAttempt`, `ContactEngagementArea`, `CallPool`, `CallPoolOperator` (used by every later backend task).

- [ ] **Step 1: Append enums** to `Enums.cs` (after the existing `FormStatus` enum):

```csharp
public enum CallOutcome
{
    ValidContact,
    WrongNumber,
    NotInService,
    NoAnswer,
    Refused
}

public enum PartyRelation
{
    StayMember,
    Sympathizer,
    NoCooperation
}

public enum ActivityLevel
{
    Active,
    Occasional,
    Inactive
}

public enum EngagementArea
{
    MunicipalBoard,
    DepartmentalBoards,
    CentralOffice,
    OrganizationalExecutive,
    ElectionCampaign,
    ElectionMonitor
}

public enum ContactFinalStatus
{
    ActiveMember,
    InactiveMember,
    Sympathizer,
    NoCooperation
}
```

- [ ] **Step 2: Create `Campaign.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Campaigns")]
public class Campaign : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public DateOnly? StartDate { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<CallContact> Contacts { get; set; } = [];

    public ICollection<CallPool> Pools { get; set; } = [];
}
```

- [ ] **Step 3: Create `CallContact.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallContacts")]
public class CallContact : BaseEntity
{
    // Imported / basic
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = null!;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = null!;

    [Required, MaxLength(30)]
    public string PhoneNumber { get; set; } = null!;

    [MaxLength(200), EmailAddress]
    public string? Email { get; set; }

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(200)]
    public string? City { get; set; }

    public int? MunicipalityId { get; set; }

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality? Municipality { get; set; }

    [Required]
    public int CampaignId { get; set; }

    [ForeignKey(nameof(CampaignId))]
    public Campaign Campaign { get; set; } = null!;

    // Assignment
    public int? PoolId { get; set; }

    [ForeignKey(nameof(PoolId))]
    public CallPool? Pool { get; set; }

    [MaxLength(450)]
    public string? ClaimedByUserId { get; set; }

    public DateTime? ClaimedAt { get; set; }

    public int AttemptCount { get; set; }

    public DateTime? LastCalledAt { get; set; }

    // Linking / conversion
    public int? MatchedMemberId { get; set; }

    [ForeignKey(nameof(MatchedMemberId))]
    public Member? MatchedMember { get; set; }

    public int? ConvertedMemberId { get; set; }

    [ForeignKey(nameof(ConvertedMemberId))]
    public Member? ConvertedMember { get; set; }

    // Call outcome (nullable until called)
    public CallOutcome? LastOutcome { get; set; }

    public PartyRelation? PartyRelation { get; set; }

    public ActivityLevel? ActivityLevel { get; set; }

    public bool? WantsToBeActive { get; set; }

    [MaxLength(2000)]
    public string? SuggestionNote { get; set; }

    public bool? KnowsPotentialMembers { get; set; }

    public bool? WillingToEnroll { get; set; }

    public ContactFinalStatus? FinalStatus { get; set; }

    public ICollection<CallAttempt> Attempts { get; set; } = [];

    public ICollection<ContactEngagementArea> EngagementAreas { get; set; } = [];
}
```

- [ ] **Step 4: Create `CallAttempt.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallAttempts")]
public class CallAttempt : BaseEntity
{
    [Required]
    public int CallContactId { get; set; }

    [ForeignKey(nameof(CallContactId))]
    public CallContact CallContact { get; set; } = null!;

    [Required]
    public CallOutcome Outcome { get; set; }

    [Required, MaxLength(450)]
    public string CalledByUserId { get; set; } = null!;

    public DateTime CalledAt { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }
}
```

- [ ] **Step 5: Create `ContactEngagementArea.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("ContactEngagementAreas")]
public class ContactEngagementArea : BaseEntity
{
    [Required]
    public int CallContactId { get; set; }

    [ForeignKey(nameof(CallContactId))]
    public CallContact CallContact { get; set; } = null!;

    [Required]
    public EngagementArea Area { get; set; }
}
```

- [ ] **Step 6: Create `CallPool.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallPools")]
public class CallPool : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public int CampaignId { get; set; }

    [ForeignKey(nameof(CampaignId))]
    public Campaign Campaign { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    // Stored filter criteria (snapshot re-runnable)
    [MaxLength(200)]
    public string? FilterCity { get; set; }

    public int? FilterMunicipalityId { get; set; }

    public CallOutcome? FilterOutcome { get; set; }

    [MaxLength(2000)]
    public string? FilterJson { get; set; }

    public ICollection<CallPoolOperator> Operators { get; set; } = [];

    public ICollection<CallContact> Contacts { get; set; } = [];
}
```

- [ ] **Step 7: Create `CallPoolOperator.cs`:**

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallPoolOperators")]
public class CallPoolOperator : BaseEntity
{
    [Required]
    public int CallPoolId { get; set; }

    [ForeignKey(nameof(CallPoolId))]
    public CallPool CallPool { get; set; } = null!;

    [Required, MaxLength(450)]
    public string UserId { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;
}
```

- [ ] **Step 8: Build to verify entities compile.**

Run: `dotnet build src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: Build succeeded (DbSets not yet added — that's Task 2; entities alone must compile).

- [ ] **Step 9: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs src/backend/Marsipan.Membership.Middleware/Entities/
git commit -m "feat: add call center entities and enums"
```

---

## Task 2: DbContext registration + migration

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Migrations/*_AddCallCenter.cs` (via CLI)

**Interfaces:**
- Consumes: entities from Task 1.
- Produces: `_db.Campaigns`, `_db.CallContacts`, `_db.CallAttempts`, `_db.ContactEngagementAreas`, `_db.CallPools`, `_db.CallPoolOperators` (used by all services).

- [ ] **Step 1: Add DbSets** after the `EventMemberships` DbSet in `ApplicationContext.cs`:

```csharp
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CallContact> CallContacts => Set<CallContact>();
    public DbSet<CallAttempt> CallAttempts => Set<CallAttempt>();
    public DbSet<ContactEngagementArea> ContactEngagementAreas => Set<ContactEngagementArea>();
    public DbSet<CallPool> CallPools => Set<CallPool>();
    public DbSet<CallPoolOperator> CallPoolOperators => Set<CallPoolOperator>();
```

- [ ] **Step 2: Add relationship + index + query-filter config** inside `OnModelCreating`, immediately before the seed-data section (the `modelBuilder.Entity<IdentityRole>().HasData(...)` call):

```csharp
        // ----- Call center -----

        // Campaign is an aggregate root: soft-delete filter.
        modelBuilder.Entity<Campaign>().HasQueryFilter(e => !e.IsDeleted);

        // CallContact aggregate root: soft-delete filter + report/query indexes.
        modelBuilder.Entity<CallContact>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.FinalStatus);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.PoolId);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.CampaignId);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.PhoneNumber);

        // CallPool aggregate root: soft-delete filter.
        modelBuilder.Entity<CallPool>().HasQueryFilter(e => !e.IsDeleted);

        // CallContact → Campaign (restrict: deleting a campaign must not wipe contacts).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Campaign)
            .WithMany(c => c.Contacts)
            .HasForeignKey(c => c.CampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallContact → CallPool (nullable; SetNull so releasing/deleting a pool clears membership).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Pool)
            .WithMany(p => p.Contacts)
            .HasForeignKey(c => c.PoolId)
            .OnDelete(DeleteBehavior.SetNull);

        // CallContact → Member links (nullable, restrict).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.MatchedMember)
            .WithMany()
            .HasForeignKey(c => c.MatchedMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.ConvertedMember)
            .WithMany()
            .HasForeignKey(c => c.ConvertedMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallContact → Municipality (nullable, restrict).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Municipality)
            .WithMany()
            .HasForeignKey(c => c.MunicipalityId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallAttempt → CallContact (cascade: attempts are owned by the contact).
        modelBuilder.Entity<CallAttempt>()
            .HasOne(a => a.CallContact)
            .WithMany(c => c.Attempts)
            .HasForeignKey(a => a.CallContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContactEngagementArea → CallContact (cascade: owned child).
        modelBuilder.Entity<ContactEngagementArea>()
            .HasOne(e => e.CallContact)
            .WithMany(c => c.EngagementAreas)
            .HasForeignKey(e => e.CallContactId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ContactEngagementArea>()
            .HasIndex(e => new { e.CallContactId, e.Area })
            .IsUnique();

        // CallPool → Campaign (restrict).
        modelBuilder.Entity<CallPool>()
            .HasOne(p => p.Campaign)
            .WithMany(c => c.Pools)
            .HasForeignKey(p => p.CampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallPoolOperator → CallPool (cascade) and → ApplicationUser (restrict).
        modelBuilder.Entity<CallPoolOperator>()
            .HasOne(o => o.CallPool)
            .WithMany(p => p.Operators)
            .HasForeignKey(o => o.CallPoolId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CallPoolOperator>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CallPoolOperator>()
            .HasIndex(o => new { o.CallPoolId, o.UserId })
            .IsUnique();
```

- [ ] **Step 3: Build to verify config compiles.**

Run: `dotnet build src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: Build succeeded.

- [ ] **Step 4: Create the migration.**

Run:
```powershell
dotnet ef migrations add AddCallCenter --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Web
```
Expected: a new `Migrations/<timestamp>_AddCallCenter.cs` creating tables `Campaigns`, `CallContacts`, `CallAttempts`, `ContactEngagementAreas`, `CallPools`, `CallPoolOperators`. Open it and confirm no unexpected drops of existing tables.

- [ ] **Step 5: Apply the migration to the local DB.**

Run:
```powershell
dotnet ef database update --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Web
```
Expected: "Done." and the six tables exist. (If the DB has never been created, this also runs all prior migrations.)

- [ ] **Step 6: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs src/backend/Marsipan.Membership.Middleware/Migrations/
git commit -m "feat: register call center DbSets and add AddCallCenter migration"
```

---

## Task 3: DTOs

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/DTOs/CampaignDtos.cs`, `CallContactDtos.cs`, `CallPoolDtos.cs`, `CallCenterReportDtos.cs`

**Interfaces:**
- Consumes: enums from Task 1.
- Produces: all DTO record types consumed by services (Tasks 5–9) and controllers.

- [ ] **Step 1: Create `CampaignDtos.cs`:**

```csharp
namespace Marsipan.Membership.Middleware.DTOs;

public record CampaignDto(
    int Id,
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive,
    int ContactCount);

public record CreateCampaignRequest(
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive);

public record UpdateCampaignRequest(
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive);
```

- [ ] **Step 2: Create `CallContactDtos.cs`:**

```csharp
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record CallContactQuery(
    int? CampaignId,
    int? PoolId,
    string? City,
    int? MunicipalityId,
    ContactFinalStatus? FinalStatus,
    CallOutcome? LastOutcome,
    string? Search,
    int Page = 1,
    int PageSize = 20);

public record CallContactListItemDto(
    int Id,
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? City,
    int CampaignId,
    int? PoolId,
    int AttemptCount,
    CallOutcome? LastOutcome,
    ContactFinalStatus? FinalStatus,
    int? MatchedMemberId,
    int? ConvertedMemberId);

public record CallContactDetailDto(
    int Id,
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    string? Address,
    string? City,
    int? MunicipalityId,
    int CampaignId,
    int? PoolId,
    int AttemptCount,
    CallOutcome? LastOutcome,
    PartyRelation? PartyRelation,
    ActivityLevel? ActivityLevel,
    bool? WantsToBeActive,
    string? SuggestionNote,
    bool? KnowsPotentialMembers,
    bool? WillingToEnroll,
    ContactFinalStatus? FinalStatus,
    int? MatchedMemberId,
    int? ConvertedMemberId,
    List<EngagementArea> EngagementAreas);

public record ImportResultDto(
    int Imported,
    int Skipped,
    List<string> Errors);

// Full call-script payload posted from the operator wizard.
public record SaveCallOutcomeRequest(
    CallOutcome Outcome,
    string? AttemptNote,
    PartyRelation? PartyRelation,
    ActivityLevel? ActivityLevel,
    bool? WantsToBeActive,
    List<EngagementArea>? EngagementAreas,
    string? UpdatedPhone,
    string? UpdatedEmail,
    string? UpdatedAddress,
    string? SuggestionNote,
    bool? KnowsPotentialMembers,
    bool? WillingToEnroll);

public record MemberMatchDto(
    int MemberId,
    string DisplayName,
    string? PhoneNumber,
    string CommitteeName);

// Pre-fill payload handed to the Add-Member form on enrollment.
public record EnrollmentPrefillDto(
    string FirstName,
    string LastName,
    string PhoneNumber,
    string? Email,
    string? City,
    int? MunicipalityId);
```

- [ ] **Step 3: Create `CallPoolDtos.cs`:**

```csharp
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record CallPoolDto(
    int Id,
    string Name,
    int CampaignId,
    bool IsActive,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome,
    int ContactCount,
    List<PoolOperatorDto> Operators);

public record PoolOperatorDto(string UserId, string UserName);

public record CreateCallPoolRequest(
    string Name,
    int CampaignId,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome);

public record UpdateCallPoolRequest(
    string Name,
    bool IsActive,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome);

public record AssignOperatorsRequest(List<string> UserIds);

public record RefreshResultDto(int Added, int TotalInPool);
```

- [ ] **Step 4: Create `CallCenterReportDtos.cs`:**

```csharp
namespace Marsipan.Membership.Middleware.DTOs;

public record CallCenterReportQuery(
    int? CampaignId,
    int? PoolId,
    DateTime? FromDate,
    DateTime? ToDate);

public record EngagementAreaCountDto(string Area, int Count);

public record SuggestionCountDto(string Suggestion, int Count);

public record CallCenterReportDto(
    int Contacted,
    int InvalidContacts,
    int ActiveMembers,
    int InactiveMembers,
    int Sympathizers,
    int NoCooperation,
    int InterestedInActivating,
    List<EngagementAreaCountDto> EngagementAreaCounts,
    List<SuggestionCountDto> TopSuggestions);
```

- [ ] **Step 5: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: Build succeeded.

- [ ] **Step 6: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/
git commit -m "feat: add call center DTOs"
```

---

## Task 4: Scope filter for call contacts

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/ScopeFilters.cs`

**Interfaces:**
- Consumes: `CallContact`, `ICurrentUserContext`.
- Produces: `IQueryable<CallContact> ApplyCallContactScope(this IQueryable<CallContact> q, ICurrentUserContext user)` — used by `CallContactService` and `CallCenterReportService`.

- [ ] **Step 1: Add the extension method** to `ScopeFilters` (after `ApplyFormScope`, before `IsUnrestricted`):

```csharp
    /// <summary>
    /// Restricts a CallContact query to the rows the caller may see.
    /// SuperAdmin/Admin see everything; Operators see only contacts in pools
    /// they are assigned to (via CallPoolOperator); every other restricted role
    /// sees nothing. Unauthenticated callers get an empty result.
    /// </summary>
    public static IQueryable<CallContact> ApplyCallContactScope(
        this IQueryable<CallContact> q,
        ICurrentUserContext user)
    {
        ArgumentNullException.ThrowIfNull(q);
        ArgumentNullException.ThrowIfNull(user);

        if (!user.IsAuthenticated)
        {
            return q.Where(_ => false);
        }

        if (IsUnrestricted(user.Role))
        {
            return q;
        }

        if (string.Equals(user.Role, RoleOperator, StringComparison.Ordinal))
        {
            if (string.IsNullOrEmpty(user.Id))
            {
                return q.Where(_ => false);
            }

            var userId = user.Id;
            return q.Where(c => c.PoolId != null
                && c.Pool!.Operators.Any(o => o.UserId == userId));
        }

        // LocalAdmin / Viewer / anything else: call center is not scoped by
        // committee, so restricted non-operator roles see nothing.
        return q.Where(_ => false);
    }
```

- [ ] **Step 2: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: Build succeeded.

- [ ] **Step 3: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ScopeFilters.cs
git commit -m "feat: add call contact scope filter"
```

---

## Task 5: Campaign service + controller

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/ICampaignService.cs`, `CampaignService.cs`
- Create: `src/backend/Marsipan.Membership.Web/Controllers/Admin/CampaignsController.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`

**Interfaces:**
- Consumes: `ApplicationContext`, `ICurrentUserContext`, `CampaignDto`/`CreateCampaignRequest`/`UpdateCampaignRequest`, `PagedResultDto<T>`.
- Produces: `ICampaignService` with `SearchAsync`, `GetByIdAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`.

- [ ] **Step 1: Create `ICampaignService.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICampaignService
{
    Task<PagedResultDto<CampaignDto>> SearchAsync(int page, int pageSize, CancellationToken ct = default);
    Task<CampaignDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct = default);
    Task UpdateAsync(int id, UpdateCampaignRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create `CampaignService.cs`:**

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CampaignService : ICampaignService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CampaignService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<PagedResultDto<CampaignDto>> SearchAsync(int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var q = _db.Campaigns.OrderByDescending(c => c.Id);
        var total = await q.CountAsync(ct);
        var items = await q
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.Description, c.StartDate, c.IsActive,
                c.Contacts.Count))
            .ToListAsync(ct);

        return new PagedResultDto<CampaignDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    public async Task<CampaignDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.Campaigns
            .Where(c => c.Id == id)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.Description, c.StartDate, c.IsActive, c.Contacts.Count))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var campaign = new Campaign
        {
            Name = request.Name,
            Description = request.Description,
            StartDate = request.StartDate,
            IsActive = request.IsActive,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        };
        _db.Campaigns.Add(campaign);
        await _db.SaveChangesAsync(ct);
        return new CampaignDto(campaign.Id, campaign.Name, campaign.Description,
            campaign.StartDate, campaign.IsActive, 0);
    }

    public async Task UpdateAsync(int id, UpdateCampaignRequest request, CancellationToken ct = default)
    {
        var campaign = await _db.Campaigns.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Campaign {id} not found.");
        campaign.Name = request.Name;
        campaign.Description = request.Description;
        campaign.StartDate = request.StartDate;
        campaign.IsActive = request.IsActive;
        campaign.LastModifiedDate = DateTime.UtcNow;
        campaign.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var campaign = await _db.Campaigns.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Campaign {id} not found.");
        campaign.IsDeleted = true;
        campaign.LastModifiedDate = DateTime.UtcNow;
        campaign.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 3: Create `CampaignsController.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/campaigns")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CampaignsController : ControllerBase
{
    private readonly ICampaignService _campaigns;

    public CampaignsController(ICampaignService campaigns) => _campaigns = campaigns;

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<CampaignDto>>> List(
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct)
        => Ok(await _campaigns.SearchAsync(page == 0 ? 1 : page, pageSize == 0 ? 20 : pageSize, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CampaignDto>> GetById(int id, CancellationToken ct)
    {
        var c = await _campaigns.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignDto>> Create([FromBody] CreateCampaignRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var created = await _campaigns.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCampaignRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try { await _campaigns.UpdateAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try { await _campaigns.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
```

- [ ] **Step 4: Register the service** in `Program.cs` (next to the other `AddScoped` service lines, e.g. after `IDashboardService`):

```csharp
builder.Services.AddScoped<ICampaignService, CampaignService>();
```

- [ ] **Step 5: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 6: Manual check.** Start the API (`dotnet run --project src/backend/Marsipan.Membership.Web`), obtain an Admin JWT via `/api/auth/login`, then:
```bash
curl -k -X POST https://localhost:7226/api/campaigns -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"name":"Ажурирање мај 2026","description":null,"startDate":null,"isActive":true}'
curl -k https://localhost:7226/api/campaigns -H "Authorization: Bearer <token>"
```
Expected: 201 then a paged list containing the campaign with `contactCount: 0`.

- [ ] **Step 7: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ICampaignService.cs src/backend/Marsipan.Membership.Middleware/Services/CampaignService.cs src/backend/Marsipan.Membership.Web/Controllers/Admin/CampaignsController.cs src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: add campaign service and API"
```

---

## Task 6: Contact import (CSV/Excel)

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/ICallContactImportService.cs`, `CallContactImportService.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs` (register service)
- (Import endpoint is added to `CallContactsController` in Task 8; here we expose the service.)

**Interfaces:**
- Consumes: `ApplicationContext`, `ICurrentUserContext`, `Campaign`, `CallContact`, `ImportResultDto`.
- Produces: `ICallContactImportService.ImportAsync(int campaignId, Stream file, string fileName, CancellationToken)` → `ImportResultDto`.

- [ ] **Step 1: Add NuGet packages** to `Marsipan.Membership.Middleware.csproj` (inside the existing `<ItemGroup>` of PackageReferences):

```xml
    <PackageReference Include="CsvHelper" Version="33.0.1" />
    <PackageReference Include="ClosedXML" Version="0.104.2" />
```

- [ ] **Step 2: Restore.**

Run: `dotnet restore src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: restore succeeds, both packages resolved.

- [ ] **Step 3: Create `ICallContactImportService.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallContactImportService
{
    /// <summary>
    /// Parses a CSV or XLSX lead list and bulk-inserts contacts into the campaign.
    /// Expected columns (header row, case-insensitive): FirstName, LastName, Phone,
    /// Email, Address, City, Municipality. FirstName+LastName+Phone are required;
    /// rows missing any are skipped and reported.
    /// </summary>
    Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default);
}
```

- [ ] **Step 4: Create `CallContactImportService.cs`:**

```csharp
using System.Globalization;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallContactImportService : ICallContactImportService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallContactImportService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    private sealed record RawRow(string? FirstName, string? LastName, string? Phone,
        string? Email, string? Address, string? City, string? Municipality);

    public async Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
    {
        var campaignExists = await _db.Campaigns.AnyAsync(c => c.Id == campaignId, ct);
        if (!campaignExists) throw new KeyNotFoundException($"Campaign {campaignId} not found.");

        var rows = fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)
            ? ReadXlsx(file)
            : ReadCsv(file);

        var errors = new List<string>();
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var toAdd = new List<CallContact>();
        int line = 1;

        foreach (var r in rows)
        {
            line++;
            if (string.IsNullOrWhiteSpace(r.FirstName) ||
                string.IsNullOrWhiteSpace(r.LastName) ||
                string.IsNullOrWhiteSpace(r.Phone))
            {
                errors.Add($"Row {line}: missing FirstName, LastName, or Phone — skipped.");
                continue;
            }

            toAdd.Add(new CallContact
            {
                FirstName = r.FirstName!.Trim(),
                LastName = r.LastName!.Trim(),
                PhoneNumber = r.Phone!.Trim(),
                Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email!.Trim(),
                Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address!.Trim(),
                City = string.IsNullOrWhiteSpace(r.City) ? null : r.City!.Trim(),
                CampaignId = campaignId,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = uid,
                LastModifiedByUserId = uid
            });
        }

        _db.CallContacts.AddRange(toAdd);
        await _db.SaveChangesAsync(ct);

        return new ImportResultDto(toAdd.Count, errors.Count, errors);
    }

    private static List<RawRow> ReadCsv(Stream file)
    {
        using var reader = new StreamReader(file);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            PrepareHeaderForMatch = a => a.Header.Trim().ToLowerInvariant()
        });
        csv.Read();
        csv.ReadHeader();
        var rows = new List<RawRow>();
        while (csv.Read())
        {
            rows.Add(new RawRow(
                Get(csv, "firstname"), Get(csv, "lastname"), Get(csv, "phone"),
                Get(csv, "email"), Get(csv, "address"), Get(csv, "city"), Get(csv, "municipality")));
        }
        return rows;

        static string? Get(CsvReader c, string name)
            => c.TryGetField<string>(name, out var v) ? v : null;
    }

    private static List<RawRow> ReadXlsx(Stream file)
    {
        using var wb = new XLWorkbook(file);
        var ws = wb.Worksheets.First();
        var rowsUsed = ws.RangeUsed()?.RowsUsed().ToList() ?? new();
        if (rowsUsed.Count == 0) return new();

        // Header row → column index map (case-insensitive).
        var header = rowsUsed[0];
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in header.Cells())
            map[cell.GetString().Trim()] = cell.Address.ColumnNumber;

        var rows = new List<RawRow>();
        foreach (var row in rowsUsed.Skip(1))
        {
            rows.Add(new RawRow(
                Cell(row, map, "FirstName"), Cell(row, map, "LastName"), Cell(row, map, "Phone"),
                Cell(row, map, "Email"), Cell(row, map, "Address"), Cell(row, map, "City"),
                Cell(row, map, "Municipality")));
        }
        return rows;

        static string? Cell(IXLRangeRow row, Dictionary<string, int> map, string name)
            => map.TryGetValue(name, out var col) ? row.Cell(col).GetString() : null;
    }
}
```

- [ ] **Step 5: Register the service** in `Program.cs`:

```csharp
builder.Services.AddScoped<ICallContactImportService, CallContactImportService>();
```

- [ ] **Step 6: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 7: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj src/backend/Marsipan.Membership.Middleware/Services/ICallContactImportService.cs src/backend/Marsipan.Membership.Middleware/Services/CallContactImportService.cs src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: add CSV/Excel contact import service"
```

---

## Task 7: Pool service + controller

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/ICallPoolService.cs`, `CallPoolService.cs`
- Create: `src/backend/Marsipan.Membership.Web/Controllers/Admin/CallPoolsController.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`

**Interfaces:**
- Consumes: `ApplicationContext`, `ICurrentUserContext`, pool DTOs from Task 3.
- Produces: `ICallPoolService` with `ListAsync`, `GetByIdAsync`, `CreateAsync`, `UpdateAsync`, `DeleteAsync`, `RefreshAsync`, `SetOperatorsAsync`, `RemoveOperatorAsync`.

**Snapshot rule:** create/refresh stamps `PoolId` on matching, currently pool-less contacts of the campaign. A contact belongs to ≤ 1 pool, so matching excludes contacts already in another pool.

- [ ] **Step 1: Create `ICallPoolService.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallPoolService
{
    Task<List<CallPoolDto>> ListAsync(int? campaignId, CancellationToken ct = default);
    Task<CallPoolDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CallPoolDto> CreateAsync(CreateCallPoolRequest request, CancellationToken ct = default);
    Task UpdateAsync(int id, UpdateCallPoolRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<RefreshResultDto> RefreshAsync(int id, CancellationToken ct = default);
    Task SetOperatorsAsync(int id, List<string> userIds, CancellationToken ct = default);
    Task RemoveOperatorAsync(int id, string userId, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create `CallPoolService.cs`:**

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallPoolService : ICallPoolService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallPoolService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<List<CallPoolDto>> ListAsync(int? campaignId, CancellationToken ct = default)
    {
        var q = _db.CallPools.AsQueryable();
        if (campaignId is not null) q = q.Where(p => p.CampaignId == campaignId);
        return await q.OrderByDescending(p => p.Id).Select(ToDto()).ToListAsync(ct);
    }

    public async Task<CallPoolDto?> GetByIdAsync(int id, CancellationToken ct = default)
        => await _db.CallPools.Where(p => p.Id == id).Select(ToDto()).FirstOrDefaultAsync(ct);

    public async Task<CallPoolDto> CreateAsync(CreateCallPoolRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var pool = new CallPool
        {
            Name = request.Name,
            CampaignId = request.CampaignId,
            IsActive = true,
            FilterCity = request.FilterCity,
            FilterMunicipalityId = request.FilterMunicipalityId,
            FilterOutcome = request.FilterOutcome,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        };
        _db.CallPools.Add(pool);
        await _db.SaveChangesAsync(ct);

        await StampMatchingContactsAsync(pool, ct);

        return (await GetByIdAsync(pool.Id, ct))!;
    }

    public async Task UpdateAsync(int id, UpdateCallPoolRequest request, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        pool.Name = request.Name;
        pool.IsActive = request.IsActive;
        pool.FilterCity = request.FilterCity;
        pool.FilterMunicipalityId = request.FilterMunicipalityId;
        pool.FilterOutcome = request.FilterOutcome;
        pool.LastModifiedDate = DateTime.UtcNow;
        pool.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        // Release contacts back to the unassigned queue.
        var contacts = await _db.CallContacts.Where(c => c.PoolId == id).ToListAsync(ct);
        foreach (var c in contacts) c.PoolId = null;
        pool.IsDeleted = true;
        pool.LastModifiedDate = DateTime.UtcNow;
        pool.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task<RefreshResultDto> RefreshAsync(int id, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");
        var added = await StampMatchingContactsAsync(pool, ct);
        var total = await _db.CallContacts.CountAsync(c => c.PoolId == id, ct);
        return new RefreshResultDto(added, total);
    }

    public async Task SetOperatorsAsync(int id, List<string> userIds, CancellationToken ct = default)
    {
        var pool = await _db.CallPools.Include(p => p.Operators)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException($"Pool {id} not found.");

        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var existing = pool.Operators.Select(o => o.UserId).ToHashSet();

        foreach (var userId in userIds.Distinct())
        {
            if (existing.Contains(userId)) continue;
            pool.Operators.Add(new CallPoolOperator
            {
                CallPoolId = id,
                UserId = userId,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = uid,
                LastModifiedByUserId = uid
            });
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveOperatorAsync(int id, string userId, CancellationToken ct = default)
    {
        var op = await _db.CallPoolOperators
            .FirstOrDefaultAsync(o => o.CallPoolId == id && o.UserId == userId, ct);
        if (op is null) return;
        _db.CallPoolOperators.Remove(op);
        await _db.SaveChangesAsync(ct);
    }

    // Stamps PoolId on matching contacts of the campaign that are not already in a pool.
    private async Task<int> StampMatchingContactsAsync(CallPool pool, CancellationToken ct)
    {
        var q = _db.CallContacts.Where(c => c.CampaignId == pool.CampaignId && c.PoolId == null);
        if (!string.IsNullOrWhiteSpace(pool.FilterCity))
            q = q.Where(c => c.City == pool.FilterCity);
        if (pool.FilterMunicipalityId is not null)
            q = q.Where(c => c.MunicipalityId == pool.FilterMunicipalityId);
        if (pool.FilterOutcome is not null)
            q = q.Where(c => c.LastOutcome == pool.FilterOutcome);

        var matches = await q.ToListAsync(ct);
        foreach (var c in matches) c.PoolId = pool.Id;
        await _db.SaveChangesAsync(ct);
        return matches.Count;
    }

    private static System.Linq.Expressions.Expression<Func<CallPool, CallPoolDto>> ToDto() =>
        p => new CallPoolDto(
            p.Id, p.Name, p.CampaignId, p.IsActive,
            p.FilterCity, p.FilterMunicipalityId, p.FilterOutcome,
            p.Contacts.Count,
            p.Operators.Select(o => new PoolOperatorDto(o.UserId, o.User.UserName!)).ToList());
}
```

- [ ] **Step 3: Create `CallPoolsController.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-pools")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CallPoolsController : ControllerBase
{
    private readonly ICallPoolService _pools;

    public CallPoolsController(ICallPoolService pools) => _pools = pools;

    [HttpGet]
    public async Task<ActionResult<List<CallPoolDto>>> List([FromQuery] int? campaignId, CancellationToken ct)
        => Ok(await _pools.ListAsync(campaignId, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CallPoolDto>> GetById(int id, CancellationToken ct)
    {
        var p = await _pools.GetByIdAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<ActionResult<CallPoolDto>> Create([FromBody] CreateCallPoolRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var created = await _pools.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCallPoolRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try { await _pools.UpdateAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try { await _pools.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/refresh")]
    public async Task<ActionResult<RefreshResultDto>> Refresh(int id, CancellationToken ct)
    {
        try { return Ok(await _pools.RefreshAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/operators")]
    public async Task<IActionResult> SetOperators(int id, [FromBody] AssignOperatorsRequest dto, CancellationToken ct)
    {
        try { await _pools.SetOperatorsAsync(id, dto.UserIds, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}/operators/{userId}")]
    public async Task<IActionResult> RemoveOperator(int id, string userId, CancellationToken ct)
    {
        await _pools.RemoveOperatorAsync(id, userId, ct);
        return NoContent();
    }
}
```

- [ ] **Step 4: Register the service** in `Program.cs`:

```csharp
builder.Services.AddScoped<ICallPoolService, CallPoolService>();
```

- [ ] **Step 5: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 6: Manual check.** With a campaign that has imported contacts (see Task 8 import), create a pool filtered by city and confirm `contactCount` reflects the snapshot; call `/refresh` after importing more and confirm `added` > 0.

- [ ] **Step 7: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ICallPoolService.cs src/backend/Marsipan.Membership.Middleware/Services/CallPoolService.cs src/backend/Marsipan.Membership.Web/Controllers/Admin/CallPoolsController.cs src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: add call pool service and API"
```

---

## Task 8: Contact service + controller (queue, script, linking, enrollment)

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/ICallContactService.cs`, `CallContactService.cs`
- Create: `src/backend/Marsipan.Membership.Web/Controllers/Admin/CallContactsController.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`

**Interfaces:**
- Consumes: `ApplicationContext`, `ICurrentUserContext`, `ICallContactImportService`, `ScopeFilters.ApplyCallContactScope`, all `CallContactDtos`.
- Produces: `ICallContactService` with `SearchAsync`, `GetByIdAsync`, `GetNextForOperatorAsync`, `SaveOutcomeAsync`, `SuggestMemberMatchesAsync`, `LinkToMemberAsync`, `UnlinkAsync`, `GetEnrollmentPrefillAsync`, `SetConvertedMemberAsync`, `ImportAsync` (delegates to import service).

**FinalStatus derivation** (in `SaveOutcomeAsync`): if `Outcome != ValidContact` → leave `FinalStatus` null (no relation established). Else map `PartyRelation`: `NoCooperation` → `ContactFinalStatus.NoCooperation`; `Sympathizer` → `Sympathizer`; `StayMember` → `ActivityLevel == Inactive ? InactiveMember : ActiveMember`.

- [ ] **Step 1: Create `ICallContactService.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallContactService
{
    Task<PagedResultDto<CallContactListItemDto>> SearchAsync(CallContactQuery query, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default);
    Task SaveOutcomeAsync(int id, SaveCallOutcomeRequest request, CancellationToken ct = default);
    Task<List<MemberMatchDto>> SuggestMemberMatchesAsync(int id, CancellationToken ct = default);
    Task LinkToMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task UnlinkAsync(int id, CancellationToken ct = default);
    Task<EnrollmentPrefillDto?> GetEnrollmentPrefillAsync(int id, CancellationToken ct = default);
    Task SetConvertedMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create `CallContactService.cs`:**

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallContactService : ICallContactService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;
    private readonly ICallContactImportService _import;

    public CallContactService(ApplicationContext db, ICurrentUserContext user, ICallContactImportService import)
    {
        _db = db;
        _user = user;
        _import = import;
    }

    public async Task<PagedResultDto<CallContactListItemDto>> SearchAsync(CallContactQuery query, CancellationToken ct = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 ? 20 : query.PageSize;

        var q = _db.CallContacts.ApplyCallContactScope(_user);
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (!string.IsNullOrWhiteSpace(query.City)) q = q.Where(c => c.City == query.City);
        if (query.MunicipalityId is not null) q = q.Where(c => c.MunicipalityId == query.MunicipalityId);
        if (query.FinalStatus is not null) q = q.Where(c => c.FinalStatus == query.FinalStatus);
        if (query.LastOutcome is not null) q = q.Where(c => c.LastOutcome == query.LastOutcome);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(c => c.FirstName.Contains(s) || c.LastName.Contains(s) || c.PhoneNumber.Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(c => c.Id)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CallContactListItemDto(
                c.Id, c.FirstName, c.LastName, c.PhoneNumber, c.City,
                c.CampaignId, c.PoolId, c.AttemptCount, c.LastOutcome, c.FinalStatus,
                c.MatchedMemberId, c.ConvertedMemberId))
            .ToListAsync(ct);

        return new PagedResultDto<CallContactListItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    public async Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : ToDetail(c);
    }

    public async Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default)
    {
        var uid = _user.Id;
        if (string.IsNullOrEmpty(uid)) return null;

        var next = await _db.CallContacts.ApplyCallContactScope(_user)
            .Where(c => c.FinalStatus == null
                && (c.ClaimedByUserId == null || c.ClaimedByUserId == uid))
            .OrderBy(c => c.LastCalledAt ?? DateTime.MinValue)
            .ThenBy(c => c.Id)
            .Include(c => c.EngagementAreas)
            .FirstOrDefaultAsync(ct);

        if (next is null) return null;

        next.ClaimedByUserId = uid;
        next.ClaimedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return ToDetail(next);
    }

    public async Task SaveOutcomeAsync(int id, SaveCallOutcomeRequest request, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .Include(x => x.EngagementAreas)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";

        // 1. Log the dial attempt.
        _db.CallAttempts.Add(new CallAttempt
        {
            CallContactId = id,
            Outcome = request.Outcome,
            CalledByUserId = uid,
            CalledAt = now,
            Note = request.AttemptNote,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        });
        c.AttemptCount += 1;
        c.LastCalledAt = now;
        c.LastOutcome = request.Outcome;

        if (request.Outcome == CallOutcome.ValidContact)
        {
            // 2. Script answers.
            c.PartyRelation = request.PartyRelation;
            c.ActivityLevel = request.ActivityLevel;
            c.WantsToBeActive = request.WantsToBeActive;
            c.SuggestionNote = request.SuggestionNote;
            c.KnowsPotentialMembers = request.KnowsPotentialMembers;
            c.WillingToEnroll = request.WillingToEnroll;

            // 3. Update contact data in place.
            if (!string.IsNullOrWhiteSpace(request.UpdatedPhone)) c.PhoneNumber = request.UpdatedPhone!.Trim();
            if (request.UpdatedEmail is not null) c.Email = string.IsNullOrWhiteSpace(request.UpdatedEmail) ? null : request.UpdatedEmail.Trim();
            if (request.UpdatedAddress is not null) c.Address = string.IsNullOrWhiteSpace(request.UpdatedAddress) ? null : request.UpdatedAddress.Trim();

            // 4. Replace engagement areas.
            _db.ContactEngagementAreas.RemoveRange(c.EngagementAreas);
            foreach (var area in (request.EngagementAreas ?? new()).Distinct())
            {
                c.EngagementAreas.Add(new ContactEngagementArea
                {
                    CallContactId = id,
                    Area = area,
                    CreatedDate = now,
                    LastModifiedDate = now,
                    CreatedByUserId = uid,
                    LastModifiedByUserId = uid
                });
            }

            // 5. Derive final status.
            c.FinalStatus = request.PartyRelation switch
            {
                Enums.PartyRelation.NoCooperation => ContactFinalStatus.NoCooperation,
                Enums.PartyRelation.Sympathizer => ContactFinalStatus.Sympathizer,
                Enums.PartyRelation.StayMember =>
                    request.ActivityLevel == Enums.ActivityLevel.Inactive
                        ? ContactFinalStatus.InactiveMember
                        : ContactFinalStatus.ActiveMember,
                _ => c.FinalStatus
            };
        }

        // 6. Release the claim.
        c.ClaimedByUserId = null;
        c.ClaimedAt = null;
        c.LastModifiedDate = now;
        c.LastModifiedByUserId = uid;

        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<MemberMatchDto>> SuggestMemberMatchesAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");

        var phone = c.PhoneNumber.Trim();
        return await _db.Members
            .Where(m => m.Phones.Any(p => p.Number == phone))
            .Select(m => new MemberMatchDto(
                m.Id, m.FirstName + " " + m.LastName,
                m.Phones.Select(p => p.Number).FirstOrDefault(),
                m.Committee.Name))
            .ToListAsync(ct);
    }

    public async Task LinkToMemberAsync(int id, int memberId, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        var exists = await _db.Members.AnyAsync(m => m.Id == memberId, ct);
        if (!exists) throw new KeyNotFoundException($"Member {memberId} not found.");
        c.MatchedMemberId = memberId;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task UnlinkAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        c.MatchedMemberId = null;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task<EnrollmentPrefillDto?> GetEnrollmentPrefillAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null ? null : new EnrollmentPrefillDto(
            c.FirstName, c.LastName, c.PhoneNumber, c.Email, c.City, c.MunicipalityId);
    }

    public async Task SetConvertedMemberAsync(int id, int memberId, CancellationToken ct = default)
    {
        var c = await _db.CallContacts.ApplyCallContactScope(_user)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException($"Contact {id} not found.");
        var exists = await _db.Members.AnyAsync(m => m.Id == memberId, ct);
        if (!exists) throw new KeyNotFoundException($"Member {memberId} not found.");
        c.ConvertedMemberId = memberId;
        c.LastModifiedDate = DateTime.UtcNow;
        c.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
        => _import.ImportAsync(campaignId, file, fileName, ct);

    private static CallContactDetailDto ToDetail(CallContact c) => new(
        c.Id, c.FirstName, c.LastName, c.PhoneNumber, c.Email, c.Address, c.City,
        c.MunicipalityId, c.CampaignId, c.PoolId, c.AttemptCount, c.LastOutcome,
        c.PartyRelation, c.ActivityLevel, c.WantsToBeActive, c.SuggestionNote,
        c.KnowsPotentialMembers, c.WillingToEnroll, c.FinalStatus,
        c.MatchedMemberId, c.ConvertedMemberId,
        c.EngagementAreas.Select(e => e.Area).ToList());
}
```

- [ ] **Step 3: Create `CallContactsController.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-contacts")]
[Authorize(Policy = "ApiPolicy")]
public class CallContactsController : ControllerBase
{
    private readonly ICallContactService _contacts;

    public CallContactsController(ICallContactService contacts) => _contacts = contacts;

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<CallContactListItemDto>>> List(
        [FromQuery] CallContactQuery query, CancellationToken ct)
        => Ok(await _contacts.SearchAsync(query, ct));

    [HttpGet("next")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<ActionResult<CallContactDetailDto>> Next(CancellationToken ct)
    {
        var c = await _contacts.GetNextForOperatorAsync(ct);
        return c is null ? NoContent() : Ok(c);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CallContactDetailDto>> GetById(int id, CancellationToken ct)
    {
        var c = await _contacts.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost("import")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<ImportResultDto>> Import(
        [FromForm] int campaignId, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "file_required" });
        await using var stream = file.OpenReadStream();
        try
        {
            var result = await _contacts.ImportAsync(campaignId, stream, file.FileName, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/outcome")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<IActionResult> SaveOutcome(int id, [FromBody] SaveCallOutcomeRequest dto, CancellationToken ct)
    {
        try { await _contacts.SaveOutcomeAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:int}/match-suggestions")]
    public async Task<ActionResult<List<MemberMatchDto>>> MatchSuggestions(int id, CancellationToken ct)
    {
        try { return Ok(await _contacts.SuggestMemberMatchesAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/link/{memberId:int}")]
    public async Task<IActionResult> Link(int id, int memberId, CancellationToken ct)
    {
        try { await _contacts.LinkToMemberAsync(id, memberId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}/link")]
    public async Task<IActionResult> Unlink(int id, CancellationToken ct)
    {
        try { await _contacts.UnlinkAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:int}/enrollment-prefill")]
    public async Task<ActionResult<EnrollmentPrefillDto>> EnrollmentPrefill(int id, CancellationToken ct)
    {
        var p = await _contacts.GetEnrollmentPrefillAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost("{id:int}/converted/{memberId:int}")]
    public async Task<IActionResult> SetConverted(int id, int memberId, CancellationToken ct)
    {
        try { await _contacts.SetConvertedMemberAsync(id, memberId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
```

- [ ] **Step 4: Register the service** in `Program.cs`:

```csharp
builder.Services.AddScoped<ICallContactService, CallContactService>();
```

- [ ] **Step 5: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 6: Manual end-to-end check.**
  1. Create a campaign (Task 5).
  2. `POST /api/call-contacts/import` with a small CSV (`FirstName,LastName,Phone,Email,Address,City,Municipality` header + 2 rows, one row missing phone). Expect `{ imported: 1, skipped: 1, errors: [...] }`.
  3. Create a pool over that campaign+city, assign an operator.
  4. As that operator, `GET /api/call-contacts/next` → returns the contact and claims it.
  5. `POST /api/call-contacts/{id}/outcome` with `{ outcome: 0, partyRelation: 0, activityLevel: 2 }` → 204; re-GET shows `finalStatus = InactiveMember`, `attemptCount = 1`, claim cleared.

- [ ] **Step 7: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ICallContactService.cs src/backend/Marsipan.Membership.Middleware/Services/CallContactService.cs src/backend/Marsipan.Membership.Web/Controllers/Admin/CallContactsController.cs src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: add call contact service and API (queue, script, linking, enrollment)"
```

---

## Task 9: Reports service + controller

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/ICallCenterReportService.cs`, `CallCenterReportService.cs`
- Create: `src/backend/Marsipan.Membership.Web/Controllers/Admin/CallCenterReportsController.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`

**Interfaces:**
- Consumes: `ApplicationContext`, `ICurrentUserContext`, `CallCenterReportQuery`, `CallCenterReportDto`.
- Produces: `ICallCenterReportService.GetReportAsync(CallCenterReportQuery, CancellationToken)`.

- [ ] **Step 1: Create `ICallCenterReportService.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallCenterReportService
{
    Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default);
}
```

- [ ] **Step 2: Create `CallCenterReportService.cs`:**

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallCenterReportService : ICallCenterReportService
{
    private readonly ApplicationContext _db;

    public CallCenterReportService(ApplicationContext db) => _db = db;

    public async Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default)
    {
        var q = _db.CallContacts.AsQueryable();
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (query.FromDate is not null) q = q.Where(c => c.LastCalledAt >= query.FromDate);
        if (query.ToDate is not null) q = q.Where(c => c.LastCalledAt <= query.ToDate);

        var contacted = await q.CountAsync(c => c.LastOutcome == CallOutcome.ValidContact, ct);
        var invalid = await q.CountAsync(c =>
            c.LastOutcome == CallOutcome.WrongNumber || c.LastOutcome == CallOutcome.NotInService, ct);
        var active = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.ActiveMember, ct);
        var inactive = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.InactiveMember, ct);
        var symp = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.Sympathizer, ct);
        var noCoop = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.NoCooperation, ct);
        var interested = await q.CountAsync(c => c.WantsToBeActive == true, ct);

        var areaCounts = await _db.ContactEngagementAreas
            .Where(e => q.Any(c => c.Id == e.CallContactId))
            .GroupBy(e => e.Area)
            .Select(g => new EngagementAreaCountDto(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        var suggestions = await q
            .Where(c => c.SuggestionNote != null && c.SuggestionNote != "")
            .GroupBy(c => c.SuggestionNote!)
            .Select(g => new SuggestionCountDto(g.Key, g.Count()))
            .OrderByDescending(s => s.Count)
            .Take(20)
            .ToListAsync(ct);

        return new CallCenterReportDto(
            contacted, invalid, active, inactive, symp, noCoop, interested,
            areaCounts, suggestions);
    }
}
```

- [ ] **Step 3: Create `CallCenterReportsController.cs`:**

```csharp
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-center/reports")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CallCenterReportsController : ControllerBase
{
    private readonly ICallCenterReportService _reports;

    public CallCenterReportsController(ICallCenterReportService reports) => _reports = reports;

    [HttpGet]
    public async Task<ActionResult<CallCenterReportDto>> Get([FromQuery] CallCenterReportQuery query, CancellationToken ct)
        => Ok(await _reports.GetReportAsync(query, ct));
}
```

- [ ] **Step 4: Register the service** in `Program.cs`:

```csharp
builder.Services.AddScoped<ICallCenterReportService, CallCenterReportService>();
```

- [ ] **Step 5: Build.**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 6: Manual check.** After running the Task 8 e2e flow, `GET /api/call-center/reports?campaignId=<id>` returns counts consistent with the saved outcomes (e.g. `inactiveMembers: 1`).

- [ ] **Step 7: Commit.**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ICallCenterReportService.cs src/backend/Marsipan.Membership.Middleware/Services/CallCenterReportService.cs src/backend/Marsipan.Membership.Web/Controllers/Admin/CallCenterReportsController.cs src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: add call center reports service and API"
```

---

## Task 10: Frontend wiring — API client, script helper, config, routes, sidebar

**Files:**
- Create: `src/client/MembershipAdmin/src/services/callCenterApi.js`, `src/services/callScript.js`
- Modify: `src/client/MembershipAdmin/src/config.js` (role arrays)
- Modify: `src/client/MembershipAdmin/src/services/router.jsx`
- Modify: the sidebar nav component (find with the grep in Step 6)

**Interfaces:**
- Consumes: `api` from `framework/api.js`.
- Produces: `callCenterApi` (all endpoint wrappers), `callScript` helpers (`nextStep`, `isTerminal`), `CALLCENTER_ADMIN_ROLES`, `CALLCENTER_OPERATOR_ROLES`.

- [ ] **Step 1: Create `services/callCenterApi.js`:**

```javascript
import api from '../framework/api'

const callCenterApi = {
  // Campaigns
  listCampaigns: (page = 1, pageSize = 20) =>
    api.get('/api/campaigns', { params: { page, pageSize } }).then(r => r.data),
  getCampaign: (id) => api.get(`/api/campaigns/${id}`).then(r => r.data),
  createCampaign: (body) => api.post('/api/campaigns', body).then(r => r.data),
  updateCampaign: (id, body) => api.put(`/api/campaigns/${id}`, body),
  deleteCampaign: (id) => api.delete(`/api/campaigns/${id}`),

  // Contacts
  listContacts: (params) => api.get('/api/call-contacts', { params }).then(r => r.data),
  getContact: (id) => api.get(`/api/call-contacts/${id}`).then(r => r.data),
  getNext: () => api.get('/api/call-contacts/next').then(r => r.status === 204 ? null : r.data),
  saveOutcome: (id, body) => api.post(`/api/call-contacts/${id}/outcome`, body),
  matchSuggestions: (id) => api.get(`/api/call-contacts/${id}/match-suggestions`).then(r => r.data),
  linkMember: (id, memberId) => api.post(`/api/call-contacts/${id}/link/${memberId}`),
  unlinkMember: (id) => api.delete(`/api/call-contacts/${id}/link`),
  enrollmentPrefill: (id) => api.get(`/api/call-contacts/${id}/enrollment-prefill`).then(r => r.data),
  setConverted: (id, memberId) => api.post(`/api/call-contacts/${id}/converted/${memberId}`),
  importContacts: (campaignId, file) => {
    const form = new FormData()
    form.append('campaignId', campaignId)
    form.append('file', file)
    return api.post('/api/call-contacts/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // Pools
  listPools: (campaignId) => api.get('/api/call-pools', { params: { campaignId } }).then(r => r.data),
  getPool: (id) => api.get(`/api/call-pools/${id}`).then(r => r.data),
  createPool: (body) => api.post('/api/call-pools', body).then(r => r.data),
  updatePool: (id, body) => api.put(`/api/call-pools/${id}`, body),
  deletePool: (id) => api.delete(`/api/call-pools/${id}`),
  refreshPool: (id) => api.post(`/api/call-pools/${id}/refresh`).then(r => r.data),
  setOperators: (id, userIds) => api.post(`/api/call-pools/${id}/operators`, { userIds }),
  removeOperator: (id, userId) => api.delete(`/api/call-pools/${id}/operators/${userId}`),

  // Reports
  getReport: (params) => api.get('/api/call-center/reports', { params }).then(r => r.data),
}

export default callCenterApi
```

- [ ] **Step 2: Create `services/callScript.js`** (pure conditional-flow logic used by the wizard; keeps the component thin):

```javascript
// Enum values mirror the backend Enums.cs ordinals.
export const CALL_OUTCOME = { ValidContact: 0, WrongNumber: 1, NotInService: 2, NoAnswer: 3, Refused: 4 }
export const PARTY_RELATION = { StayMember: 0, Sympathizer: 1, NoCooperation: 2 }
export const ACTIVITY_LEVEL = { Active: 0, Occasional: 1, Inactive: 2 }
export const ENGAGEMENT_AREA = {
  MunicipalBoard: 0, DepartmentalBoards: 1, CentralOffice: 2,
  OrganizationalExecutive: 3, ElectionCampaign: 4, ElectionMonitor: 5,
}

// The ordered step keys of the wizard.
export const STEPS = [
  'outcome', 'relation', 'activity', 'engagement', 'contactData', 'suggestion', 'recommendations',
]

// Given the answers gathered so far, return the next step key, or 'end' if the
// conversation terminates. `answers` is a partial object of collected values.
export function nextStep(current, answers) {
  switch (current) {
    case 'outcome':
      // Only a valid contact continues; every other outcome ends the call.
      return answers.outcome === CALL_OUTCOME.ValidContact ? 'relation' : 'end'
    case 'relation':
      // No cooperation ends immediately.
      if (answers.relation === PARTY_RELATION.NoCooperation) return 'end'
      // Sympathizers skip activity/engagement, go straight to updating data.
      if (answers.relation === PARTY_RELATION.Sympathizer) return 'contactData'
      return 'activity'
    case 'activity':
      // Engagement questions only when they want to be (more) active.
      // Active/Occasional → ask engagement; Inactive → only if WantsToBeActive.
      if (answers.activity === ACTIVITY_LEVEL.Inactive && answers.wantsToBeActive !== true) {
        return 'contactData'
      }
      return 'engagement'
    case 'engagement':
      return 'contactData'
    case 'contactData':
      return 'suggestion'
    case 'suggestion':
      return 'recommendations'
    case 'recommendations':
      return 'end'
    default:
      return 'end'
  }
}

export function isTerminal(step) {
  return step === 'end'
}
```

- [ ] **Step 3: Add role arrays** to `config.js`. First open the file and mirror the existing `*_ROLES` exports; append:

```javascript
export const CALLCENTER_ADMIN_ROLES = ['SuperAdmin', 'Admin']
export const CALLCENTER_OPERATOR_ROLES = ['SuperAdmin', 'Admin', 'Operator']
```

- [ ] **Step 4: Add routes** to `services/router.jsx`. Add imports at the top:

```javascript
import { CALLCENTER_ADMIN_ROLES, CALLCENTER_OPERATOR_ROLES } from '../config'
import CampaignList from '../pages/callcenter/CampaignList'
import CampaignForm from '../pages/callcenter/CampaignForm'
import ContactImport from '../pages/callcenter/ContactImport'
import ContactList from '../pages/callcenter/ContactList'
import PoolList from '../pages/callcenter/PoolList'
import PoolForm from '../pages/callcenter/PoolForm'
import CallQueue from '../pages/callcenter/CallQueue'
import CallScript from '../pages/callcenter/CallScript'
import CallCenterReports from '../pages/callcenter/CallCenterReports'
```

Add these routes inside the guarded `<AppLayout />` block (next to the other feature routes):

```javascript
        <Route path="/callcenter/campaigns" element={guarded(<CampaignList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/campaigns/new" element={guarded(<CampaignForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/campaigns/:id/edit" element={guarded(<CampaignForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/import" element={guarded(<ContactImport />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/contacts" element={guarded(<ContactList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools" element={guarded(<PoolList />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools/new" element={guarded(<PoolForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/pools/:id/edit" element={guarded(<PoolForm />, CALLCENTER_ADMIN_ROLES)} />
        <Route path="/callcenter/queue" element={guarded(<CallQueue />, CALLCENTER_OPERATOR_ROLES)} />
        <Route path="/callcenter/call/:id" element={guarded(<CallScript />, CALLCENTER_OPERATOR_ROLES)} />
        <Route path="/callcenter/reports" element={guarded(<CallCenterReports />, CALLCENTER_ADMIN_ROLES)} />
```

- [ ] **Step 5: Create the page-directory placeholder** so imports resolve while building the rest (temporary — replaced by real pages in Tasks 11–16). Create `src/client/MembershipAdmin/src/pages/callcenter/CampaignList.jsx` etc. as you implement each; to keep this task independently buildable, create minimal stubs now for every imported page:

```javascript
// e.g. src/pages/callcenter/CampaignList.jsx (repeat for each page name)
export default function CampaignList() {
  return <div className="p-4">Coming soon</div>
}
```

Create a stub file for each of: `CampaignList.jsx`, `CampaignForm.jsx`, `ContactImport.jsx`, `ContactList.jsx`, `PoolList.jsx`, `PoolForm.jsx`, `CallQueue.jsx`, `CallScript.jsx`, `CallCenterReports.jsx` (default-exporting a component of the matching name).

- [ ] **Step 6: Add sidebar entries.** Find the nav component:

Run: `grep -rln "/members" src/client/MembershipAdmin/src/components src/client/MembershipAdmin/src/layout 2>/dev/null`

Open the file that renders the nav links and add a "Кол центар" group mirroring the existing item markup, with links: Кампање `/callcenter/campaigns`, Увоз `/callcenter/import`, Контакти `/callcenter/contacts`, Групе `/callcenter/pools`, Позивање `/callcenter/queue`, Извештаји `/callcenter/reports`. Gate the group's visibility on the user's role the same way existing groups do (reuse `CALLCENTER_ADMIN_ROLES`/`CALLCENTER_OPERATOR_ROLES` via whatever role check the sidebar already uses).

- [ ] **Step 7: Build the client.**

Run (from `src/client/MembershipAdmin`): `npm run build`
Expected: build succeeds; all imports resolve.

- [ ] **Step 8: Commit.**

```bash
git add src/client/MembershipAdmin/src/services/callCenterApi.js src/client/MembershipAdmin/src/services/callScript.js src/client/MembershipAdmin/src/config.js src/client/MembershipAdmin/src/services/router.jsx src/client/MembershipAdmin/src/pages/callcenter/
git commit -m "feat: wire call center routes, API client, and script helper"
```

---

## Task 11: Campaigns pages

**Files:**
- Replace stubs: `src/client/MembershipAdmin/src/pages/callcenter/CampaignList.jsx`, `CampaignForm.jsx`

**Interfaces:**
- Consumes: `callCenterApi`, react-router (`useNavigate`, `useParams`).

- [ ] **Step 1: Implement `CampaignList.jsx`** — mirror `pages/members/MembersList.jsx` for table/pagination markup. It must: load `callCenterApi.listCampaigns(page)`, render a table (Name, StartDate, Active, ContactCount), a "Нова кампања" button → `/callcenter/campaigns/new`, per-row Edit → `/callcenter/campaigns/:id/edit`, and Delete (calls `deleteCampaign` then reloads). Use the same Tailwind/TailAdmin classes as `MembersList.jsx`.

```javascript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function CampaignList() {
  const nav = useNavigate()
  const [data, setData] = useState({ items: [], totalPages: 1, page: 1 })
  const [page, setPage] = useState(1)

  const load = () => callCenterApi.listCampaigns(page).then(setData)
  useEffect(() => { load() }, [page])

  const remove = async (id) => {
    await callCenterApi.deleteCampaign(id)
    load()
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Кампање</h1>
        <button className="btn-primary" onClick={() => nav('/callcenter/campaigns/new')}>
          Нова кампања
        </button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th>Назив</th><th>Почетак</th><th>Активна</th><th>Контаката</th><th></th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((c) => (
            <tr key={c.id} className="border-t">
              <td>{c.name}</td>
              <td>{c.startDate ?? '-'}</td>
              <td>{c.isActive ? 'Да' : 'Не'}</td>
              <td>{c.contactCount}</td>
              <td className="text-right">
                <button className="mr-2" onClick={() => nav(`/callcenter/campaigns/${c.id}/edit`)}>Измени</button>
                <button className="text-red-600" onClick={() => remove(c.id)}>Обриши</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Implement `CampaignForm.jsx`** — create/edit in one component (edit when `:id` present). Fields: Name (required), Description, StartDate (date), IsActive (checkbox). On submit: `createCampaign` or `updateCampaign`, then navigate back to `/callcenter/campaigns`.

```javascript
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function CampaignForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [form, setForm] = useState({ name: '', description: '', startDate: '', isActive: true })

  useEffect(() => {
    if (id) callCenterApi.getCampaign(id).then((c) =>
      setForm({ name: c.name, description: c.description ?? '', startDate: c.startDate ?? '', isActive: c.isActive }))
  }, [id])

  const submit = async (e) => {
    e.preventDefault()
    const body = { ...form, startDate: form.startDate || null, description: form.description || null }
    if (id) await callCenterApi.updateCampaign(id, body)
    else await callCenterApi.createCampaign(body)
    nav('/callcenter/campaigns')
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <form className="p-4 max-w-lg space-y-4" onSubmit={submit}>
      <h1 className="text-xl font-semibold">{id ? 'Измена кампање' : 'Нова кампања'}</h1>
      <label className="block">Назив
        <input className="input" required value={form.name} onChange={set('name')} />
      </label>
      <label className="block">Опис
        <textarea className="input" value={form.description} onChange={set('description')} />
      </label>
      <label className="block">Почетак
        <input type="date" className="input" value={form.startDate} onChange={set('startDate')} />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Активна
      </label>
      <button className="btn-primary" type="submit">Сачувај</button>
    </form>
  )
}
```

- [ ] **Step 3: Build the client.**

Run (from `src/client/MembershipAdmin`): `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check.** Log in as Admin, create a campaign via the form, see it in the list, edit it, confirm changes persist.

- [ ] **Step 5: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/CampaignList.jsx src/client/MembershipAdmin/src/pages/callcenter/CampaignForm.jsx
git commit -m "feat: add campaign list and form pages"
```

---

## Task 12: Import page

**Files:**
- Replace stub: `src/client/MembershipAdmin/src/pages/callcenter/ContactImport.jsx`

- [ ] **Step 1: Implement `ContactImport.jsx`** — select a campaign (load via `listCampaigns`), choose a `.csv`/`.xlsx` file, submit via `importContacts`, and render the `{ imported, skipped, errors }` summary. Show the expected column header line to the user.

```javascript
import { useEffect, useState } from 'react'
import callCenterApi from '../../services/callCenterApi'

export default function ContactImport() {
  const [campaigns, setCampaigns] = useState([])
  const [campaignId, setCampaignId] = useState('')
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { callCenterApi.listCampaigns(1, 100).then((d) => setCampaigns(d.items)) }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!campaignId || !file) return
    setBusy(true)
    try { setResult(await callCenterApi.importContacts(campaignId, file)) }
    finally { setBusy(false) }
  }

  return (
    <div className="p-4 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Увоз контаката</h1>
      <p className="text-sm text-gray-500 mb-4">
        Колоне (заглавље): FirstName, LastName, Phone, Email, Address, City, Municipality
      </p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">Кампања
          <select className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
            <option value="">—</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files[0])} required />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Увоз…' : 'Увези'}</button>
      </form>
      {result && (
        <div className="mt-4">
          <p>Увезено: {result.imported}, прескочено: {result.skipped}</p>
          {result.errors?.length > 0 && (
            <ul className="text-sm text-red-600 list-disc pl-5">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build.** Run (from `src/client/MembershipAdmin`): `npm run build` → succeeds.

- [ ] **Step 3: Manual check.** Import a 2-row CSV (one row missing phone) into a campaign; confirm summary shows imported 1 / skipped 1 with the error line.

- [ ] **Step 4: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/ContactImport.jsx
git commit -m "feat: add contact import page"
```

---

## Task 13: Pools pages

**Files:**
- Replace stubs: `src/client/MembershipAdmin/src/pages/callcenter/PoolList.jsx`, `PoolForm.jsx`

**Interfaces:**
- Consumes: `callCenterApi` (`listPools`, `getPool`, `createPool`, `updatePool`, `deletePool`, `refreshPool`, `setOperators`, `removeOperator`, `listCampaigns`), and the users API for the operator list. Load operators with the existing users endpoint (`api.get('/api/users')`) — inspect `pages/users/Users.jsx` for the exact call/shape and reuse it.

- [ ] **Step 1: Implement `PoolList.jsx`** — filter by campaign, table (Name, Campaign, ContactCount, Operators count, Active), buttons: New → `/callcenter/pools/new`, Edit → `/callcenter/pools/:id/edit`, Refresh (calls `refreshPool`, shows `{added, totalInPool}` toast/inline), Delete.

```javascript
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function PoolList() {
  const nav = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [campaignId, setCampaignId] = useState('')
  const [pools, setPools] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => { callCenterApi.listCampaigns(1, 100).then((d) => setCampaigns(d.items)) }, [])
  const load = () => callCenterApi.listPools(campaignId || undefined).then(setPools)
  useEffect(() => { load() }, [campaignId])

  const refresh = async (id) => {
    const r = await callCenterApi.refreshPool(id)
    setMsg(`Додато ${r.added}, укупно у групи ${r.totalInPool}`)
    load()
  }
  const remove = async (id) => { await callCenterApi.deletePool(id); load() }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Групе за позивање</h1>
        <button className="btn-primary" onClick={() => nav('/callcenter/pools/new')}>Нова група</button>
      </div>
      <select className="input mb-4" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
        <option value="">Све кампање</option>
        {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      {msg && <p className="text-green-600 mb-2">{msg}</p>}
      <table className="w-full text-left">
        <thead><tr><th>Назив</th><th>Контаката</th><th>Оператера</th><th>Активна</th><th></th></tr></thead>
        <tbody>
          {pools.map((p) => (
            <tr key={p.id} className="border-t">
              <td>{p.name}</td><td>{p.contactCount}</td><td>{p.operators.length}</td>
              <td>{p.isActive ? 'Да' : 'Не'}</td>
              <td className="text-right">
                <button className="mr-2" onClick={() => refresh(p.id)}>Освежи</button>
                <button className="mr-2" onClick={() => nav(`/callcenter/pools/${p.id}/edit`)}>Измени</button>
                <button className="text-red-600" onClick={() => remove(p.id)}>Обриши</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Implement `PoolForm.jsx`** — create/edit. Fields: Name, Campaign (select; required on create, read-only on edit), FilterCity, FilterMunicipalityId (optional), FilterOutcome (optional select of `CALL_OUTCOME`), IsActive (edit only). Below, an operator multi-select (checkbox list from the users API) that calls `setOperators` on save; existing operators shown with a remove button calling `removeOperator`. On create submit → `createPool`; on edit → `updatePool` + `setOperators`.

```javascript
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'
import api from '../../framework/api'
import { CALL_OUTCOME } from '../../services/callScript'

export default function PoolForm() {
  const { id } = useParams()
  const nav = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({
    name: '', campaignId: '', filterCity: '', filterMunicipalityId: '', filterOutcome: '', isActive: true,
  })
  const [selectedOps, setSelectedOps] = useState([])

  useEffect(() => {
    callCenterApi.listCampaigns(1, 100).then((d) => setCampaigns(d.items))
    // Mirror pages/users/Users.jsx for the exact users endpoint + shape.
    api.get('/api/users').then((r) => setUsers(r.data.items ?? r.data))
    if (id) callCenterApi.getPool(id).then((p) => {
      setForm({
        name: p.name, campaignId: p.campaignId,
        filterCity: p.filterCity ?? '', filterMunicipalityId: p.filterMunicipalityId ?? '',
        filterOutcome: p.filterOutcome ?? '', isActive: p.isActive,
      })
      setSelectedOps(p.operators.map((o) => o.userId))
    })
  }, [id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggleOp = (uid) => setSelectedOps((s) => s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid])

  const submit = async (e) => {
    e.preventDefault()
    const body = {
      name: form.name,
      campaignId: Number(form.campaignId),
      filterCity: form.filterCity || null,
      filterMunicipalityId: form.filterMunicipalityId ? Number(form.filterMunicipalityId) : null,
      filterOutcome: form.filterOutcome === '' ? null : Number(form.filterOutcome),
    }
    let poolId = id
    if (id) { await callCenterApi.updatePool(id, { ...body, isActive: form.isActive }) }
    else { const created = await callCenterApi.createPool(body); poolId = created.id }
    await callCenterApi.setOperators(poolId, selectedOps)
    nav('/callcenter/pools')
  }

  return (
    <form className="p-4 max-w-lg space-y-4" onSubmit={submit}>
      <h1 className="text-xl font-semibold">{id ? 'Измена групе' : 'Нова група'}</h1>
      <label className="block">Назив<input className="input" required value={form.name} onChange={set('name')} /></label>
      <label className="block">Кампања
        <select className="input" required disabled={!!id} value={form.campaignId} onChange={set('campaignId')}>
          <option value="">—</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="block">Место (филтер)<input className="input" value={form.filterCity} onChange={set('filterCity')} /></label>
      <label className="block">Исход (филтер)
        <select className="input" value={form.filterOutcome} onChange={set('filterOutcome')}>
          <option value="">—</option>
          {Object.entries(CALL_OUTCOME).map(([k, v]) => <option key={v} value={v}>{k}</option>)}
        </select>
      </label>
      {id && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Активна
        </label>
      )}
      <fieldset className="border p-2">
        <legend>Оператери</legend>
        {users.map((u) => (
          <label key={u.id} className="flex items-center gap-2">
            <input type="checkbox" checked={selectedOps.includes(u.id)} onChange={() => toggleOp(u.id)} />
            {u.userName ?? u.email}
          </label>
        ))}
      </fieldset>
      <button className="btn-primary" type="submit">Сачувај</button>
    </form>
  )
}
```

> **Note for implementer:** verify the users endpoint path and response shape against `pages/users/Users.jsx` before wiring; adjust `api.get('/api/users')` and `u.id`/`u.userName` accordingly.

- [ ] **Step 3: Build.** Run (from `src/client/MembershipAdmin`): `npm run build` → succeeds.

- [ ] **Step 4: Manual check.** Create a pool filtered by a city that has imported contacts; confirm the list shows a non-zero contact count and the assigned operator appears.

- [ ] **Step 5: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/PoolList.jsx src/client/MembershipAdmin/src/pages/callcenter/PoolForm.jsx
git commit -m "feat: add call pool list and form pages"
```

---

## Task 14: Contacts list page

**Files:**
- Replace stub: `src/client/MembershipAdmin/src/pages/callcenter/ContactList.jsx`

- [ ] **Step 1: Implement `ContactList.jsx`** — filter bar (campaign select, city text, final-status select, outcome select, search box) → `callCenterApi.listContacts(params)`; paginated table (Name, Phone, City, Attempts, LastOutcome, FinalStatus, linked/converted badges). Mirror `MembersList.jsx` pagination.

```javascript
import { useEffect, useState } from 'react'
import callCenterApi from '../../services/callCenterApi'
import { CALL_OUTCOME } from '../../services/callScript'

const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

export default function ContactList() {
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', city: '', finalStatus: '', lastOutcome: '', search: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalPages: 1 })

  useEffect(() => { callCenterApi.listCampaigns(1, 100).then((d) => setCampaigns(d.items)) }, [])

  useEffect(() => {
    const params = { page, pageSize: 20 }
    if (filters.campaignId) params.campaignId = filters.campaignId
    if (filters.city) params.city = filters.city
    if (filters.finalStatus !== '') params.finalStatus = filters.finalStatus
    if (filters.lastOutcome !== '') params.lastOutcome = filters.lastOutcome
    if (filters.search) params.search = filters.search
    callCenterApi.listContacts(params).then(setData)
  }, [page, filters])

  const set = (k) => (e) => { setPage(1); setFilters({ ...filters, [k]: e.target.value }) }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Контакти</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input" value={filters.campaignId} onChange={set('campaignId')}>
          <option value="">Све кампање</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" placeholder="Место" value={filters.city} onChange={set('city')} />
        <select className="input" value={filters.finalStatus} onChange={set('finalStatus')}>
          <option value="">Сви статуси</option>
          {Object.entries(FINAL_STATUS).map(([k, v]) => <option key={v} value={v}>{k}</option>)}
        </select>
        <select className="input" value={filters.lastOutcome} onChange={set('lastOutcome')}>
          <option value="">Сви исходи</option>
          {Object.entries(CALL_OUTCOME).map(([k, v]) => <option key={v} value={v}>{k}</option>)}
        </select>
        <input className="input" placeholder="Претрага" value={filters.search} onChange={set('search')} />
      </div>
      <table className="w-full text-left">
        <thead><tr><th>Име</th><th>Телефон</th><th>Место</th><th>Покушаја</th><th>Исход</th><th>Статус</th><th>Веза</th></tr></thead>
        <tbody>
          {data.items.map((c) => (
            <tr key={c.id} className="border-t">
              <td>{c.firstName} {c.lastName}</td><td>{c.phoneNumber}</td><td>{c.city ?? '-'}</td>
              <td>{c.attemptCount}</td><td>{c.lastOutcome ?? '-'}</td><td>{c.finalStatus ?? '-'}</td>
              <td>{c.convertedMemberId ? 'Учлањен' : c.matchedMemberId ? 'Повезан' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2 mt-4">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
        <span>{page} / {data.totalPages}</span>
        <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>›</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build.** Run (from `src/client/MembershipAdmin`): `npm run build` → succeeds.

- [ ] **Step 3: Manual check.** Filter by campaign and status; confirm rows and pagination behave.

- [ ] **Step 4: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/ContactList.jsx
git commit -m "feat: add call contact list page"
```

---

## Task 15: Call queue + guided script wizard (+ member link/enroll)

**Files:**
- Replace stubs: `src/client/MembershipAdmin/src/pages/callcenter/CallQueue.jsx`, `CallScript.jsx`

**Interfaces:**
- Consumes: `callCenterApi` (`getNext`, `getContact`, `saveOutcome`, `matchSuggestions`, `linkMember`, `unlinkMember`, `enrollmentPrefill`, `setConverted`), `callScript` (`nextStep`, `STEPS`, enums), react-router.

**Enrollment hand-off contract:** `CallScript` navigates to the existing Add-Member route with the prefill payload and a return marker. Inspect `pages/members/MemberCreate.jsx` for how it reads initial values; pass prefill via `navigate('/members/new', { state: { prefill, callContactId } })`. `MemberCreate` already exists — in this task only ensure it *optionally* consumes `location.state.prefill` (add a small `useLocation` read if absent) and, after a successful create, if `location.state.callContactId` is set, calls `callCenterApi.setConverted(callContactId, newMemberId)` then returns to `/callcenter/queue`.

- [ ] **Step 1: Implement `CallQueue.jsx`** — a "Позови следећи" button calling `getNext`; on a contact, navigate to `/callcenter/call/:id`; on `null` (204) show "Нема више контаката". Optionally show the operator's remaining count via `listContacts({ finalStatus: undefined })` filtered to their pool (best-effort; skip if unclear).

```javascript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'

export default function CallQueue() {
  const nav = useNavigate()
  const [empty, setEmpty] = useState(false)
  const [busy, setBusy] = useState(false)

  const callNext = async () => {
    setBusy(true)
    try {
      const c = await callCenterApi.getNext()
      if (!c) { setEmpty(true); return }
      nav(`/callcenter/call/${c.id}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold mb-6">Позивање</h1>
      <button className="btn-primary text-lg px-8 py-4" onClick={callNext} disabled={busy}>
        {busy ? 'Учитавање…' : 'Позови следећи'}
      </button>
      {empty && <p className="mt-6 text-gray-500">Нема више контаката за позивање.</p>}
    </div>
  )
}
```

- [ ] **Step 2: Implement `CallScript.jsx`** — the 7-step conditional wizard driven by `callScript.nextStep`. Load the contact via `getContact(id)`. Maintain `answers` state and a `step` pointer starting at `'outcome'`. Each step renders its inputs; "Даље" computes `nextStep(step, answers)`; when it returns `'end'`, POST `saveOutcome(id, payload)` and navigate to `/callcenter/queue`. Include the member-linking banner (Steps 5+) using `matchSuggestions`/`linkMember` and the "Учлани" button.

```javascript
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'
import {
  nextStep, CALL_OUTCOME, PARTY_RELATION, ACTIVITY_LEVEL, ENGAGEMENT_AREA,
} from '../../services/callScript'

export default function CallScript() {
  const { id } = useParams()
  const nav = useNavigate()
  const [contact, setContact] = useState(null)
  const [step, setStep] = useState('outcome')
  const [answers, setAnswers] = useState({ engagementAreas: [] })
  const [matches, setMatches] = useState([])

  useEffect(() => {
    callCenterApi.getContact(id).then((c) => {
      setContact(c)
      setAnswers((a) => ({ ...a, updatedPhone: c.phoneNumber, updatedEmail: c.email ?? '', updatedAddress: c.address ?? '' }))
    })
    callCenterApi.matchSuggestions(id).then(setMatches).catch(() => {})
  }, [id])

  const advance = async () => {
    const next = nextStep(step, answers)
    if (next === 'end') return finish()
    setStep(next)
  }

  const finish = async () => {
    const payload = {
      outcome: answers.outcome,
      attemptNote: answers.attemptNote ?? null,
      partyRelation: answers.relation ?? null,
      activityLevel: answers.activity ?? null,
      wantsToBeActive: answers.wantsToBeActive ?? null,
      engagementAreas: answers.engagementAreas,
      updatedPhone: answers.updatedPhone ?? null,
      updatedEmail: answers.updatedEmail ?? null,
      updatedAddress: answers.updatedAddress ?? null,
      suggestionNote: answers.suggestionNote ?? null,
      knowsPotentialMembers: answers.knowsPotentialMembers ?? null,
      willingToEnroll: answers.willingToEnroll ?? null,
    }
    await callCenterApi.saveOutcome(id, payload)
    nav('/callcenter/queue')
  }

  const enroll = () => {
    nav('/members/new', { state: { prefill: {
      firstName: contact.firstName, lastName: contact.lastName,
      phoneNumber: contact.phoneNumber, email: contact.email, city: contact.city,
    }, callContactId: Number(id) } })
  }

  const link = async (memberId) => { await callCenterApi.linkMember(id, memberId); alert('Повезано') }
  const toggleArea = (v) => setAnswers((a) => ({
    ...a, engagementAreas: a.engagementAreas.includes(v)
      ? a.engagementAreas.filter((x) => x !== v) : [...a.engagementAreas, v],
  }))

  if (!contact) return <div className="p-4">Учитавање…</div>

  return (
    <div className="p-4 max-w-xl">
      <h1 className="text-xl font-semibold mb-2">{contact.firstName} {contact.lastName} — {contact.phoneNumber}</h1>

      {step !== 'outcome' && matches.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 p-3 mb-4 rounded">
          <p className="font-medium">Могуће подударање са чланом:</p>
          {matches.map((m) => (
            <div key={m.memberId} className="flex justify-between">
              <span>{m.displayName} ({m.committeeName})</span>
              <button className="text-blue-600" onClick={() => link(m.memberId)}>Повежи</button>
            </div>
          ))}
        </div>
      )}

      {step === 'outcome' && (
        <Step title="Да ли је успостављен контакт са правом особом?">
          {Object.entries(CALL_OUTCOME).map(([k, v]) => (
            <Radio key={v} name="outcome" label={k} checked={answers.outcome === v}
              onChange={() => setAnswers({ ...answers, outcome: v })} />
          ))}
        </Step>
      )}

      {step === 'relation' && (
        <Step title="Да ли желите да и даље будете део странке?">
          {Object.entries(PARTY_RELATION).map(([k, v]) => (
            <Radio key={v} name="relation" label={k} checked={answers.relation === v}
              onChange={() => setAnswers({ ...answers, relation: v })} />
          ))}
        </Step>
      )}

      {step === 'activity' && (
        <Step title="Да ли сте тренутно активни у странци?">
          {Object.entries(ACTIVITY_LEVEL).map(([k, v]) => (
            <Radio key={v} name="activity" label={k} checked={answers.activity === v}
              onChange={() => setAnswers({ ...answers, activity: v })} />
          ))}
          {answers.activity === ACTIVITY_LEVEL.Inactive && (
            <label className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={answers.wantsToBeActive === true}
                onChange={(e) => setAnswers({ ...answers, wantsToBeActive: e.target.checked })} />
              Да ли бисте желели да будете активни?
            </label>
          )}
        </Step>
      )}

      {step === 'engagement' && (
        <Step title="У ком облику бисте желели да будете ангажовани?">
          {Object.entries(ENGAGEMENT_AREA).map(([k, v]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="checkbox" checked={answers.engagementAreas.includes(v)} onChange={() => toggleArea(v)} /> {k}
            </label>
          ))}
        </Step>
      )}

      {step === 'contactData' && (
        <Step title="Ажурирање контакт података">
          <Field label="Телефон" value={answers.updatedPhone} onChange={(v) => setAnswers({ ...answers, updatedPhone: v })} />
          <Field label="Email" value={answers.updatedEmail} onChange={(v) => setAnswers({ ...answers, updatedEmail: v })} />
          <Field label="Адреса" value={answers.updatedAddress} onChange={(v) => setAnswers({ ...answers, updatedAddress: v })} />
          <button type="button" className="btn-secondary mt-2" onClick={enroll}>Учлани као новог члана</button>
        </Step>
      )}

      {step === 'suggestion' && (
        <Step title="Да ли имате неку сугестију или предлог?">
          <textarea className="input w-full" value={answers.suggestionNote ?? ''}
            onChange={(e) => setAnswers({ ...answers, suggestionNote: e.target.value })} />
        </Step>
      )}

      {step === 'recommendations' && (
        <Step title="Препоруке потенцијалних чланова">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={answers.knowsPotentialMembers === true}
              onChange={(e) => setAnswers({ ...answers, knowsPotentialMembers: e.target.checked })} />
            Познајете некога ко дели вредности странке?
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={answers.willingToEnroll === true}
              onChange={(e) => setAnswers({ ...answers, willingToEnroll: e.target.checked })} />
            Спремни да их учланимо?
          </label>
        </Step>
      )}

      <button className="btn-primary mt-4"
        disabled={step === 'outcome' && answers.outcome === undefined}
        onClick={advance}>Даље</button>
    </div>
  )
}

function Step({ title, children }) {
  return <div><h2 className="font-medium mb-2">{title}</h2><div className="space-y-1">{children}</div></div>
}
function Radio({ name, label, checked, onChange }) {
  return <label className="flex items-center gap-2"><input type="radio" name={name} checked={checked} onChange={onChange} /> {label}</label>
}
function Field({ label, value, onChange }) {
  return <label className="block">{label}<input className="input w-full" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>
}
```

- [ ] **Step 3: Wire the enrollment return** in `pages/members/MemberCreate.jsx`. Read the file; if it doesn't already consume router `state`, add near the top:

```javascript
import { useLocation } from 'react-router-dom'
// inside the component:
const location = useLocation()
const prefill = location.state?.prefill
const callContactId = location.state?.callContactId
// seed the form's initial values from `prefill` (firstName, lastName, phoneNumber, email, city) when present.
// after a successful create returns the new member (id), if callContactId:
//   await callCenterApi.setConverted(callContactId, newMember.id)
//   navigate('/callcenter/queue')
```

Adapt to the file's actual form-state and submit handler (variable names differ). Import `callCenterApi` there.

- [ ] **Step 4: Build.** Run (from `src/client/MembershipAdmin`): `npm run build` → succeeds.

- [ ] **Step 5: Manual end-to-end check (the core flow).**
  1. As Admin: create campaign, import contacts, create pool over a city, assign yourself (or an operator).
  2. As the operator: `/callcenter/queue` → "Позови следећи" → wizard opens.
  3. Walk: outcome=ValidContact → relation=StayMember → activity=Inactive (leave "wants active" unchecked) → contact data → suggestion → recommendations → Даље → back to queue.
  4. In `/callcenter/contacts`, confirm the contact shows `FinalStatus = InactiveMember`, `Attempts = 1`.
  5. Re-run, pick a valid contact, click "Учлани", complete the Add-Member form; on save confirm you land back on the queue and the contact now shows the "Учлањен" badge (converted member id set).
  6. Confirm a WrongNumber outcome on the first step ends the call immediately with no relation/status.

- [ ] **Step 6: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/CallQueue.jsx src/client/MembershipAdmin/src/pages/callcenter/CallScript.jsx src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx
git commit -m "feat: add operator call queue and guided call script with member linking"
```

---

## Task 16: Reports page

**Files:**
- Replace stub: `src/client/MembershipAdmin/src/pages/callcenter/CallCenterReports.jsx`

- [ ] **Step 1: Implement `CallCenterReports.jsx`** — filter bar (campaign select, from/to date), fetch `callCenterApi.getReport(params)`, render the 7 scalar metrics as cards, the engagement-area counts and top-suggestions as small tables, and a "Извоз CSV" button that builds a CSV client-side from the report object and triggers a download.

```javascript
import { useEffect, useState } from 'react'
import callCenterApi from '../../services/callCenterApi'

const CARDS = [
  ['Контактирано', 'contacted'], ['Неисправни', 'invalidContacts'],
  ['Активни чланови', 'activeMembers'], ['Неактивни чланови', 'inactiveMembers'],
  ['Симпатизери', 'sympathizers'], ['Без сарадње', 'noCooperation'],
  ['Заинтересовани за активирање', 'interestedInActivating'],
]

export default function CallCenterReports() {
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', fromDate: '', toDate: '' })
  const [report, setReport] = useState(null)

  useEffect(() => { callCenterApi.listCampaigns(1, 100).then((d) => setCampaigns(d.items)) }, [])

  useEffect(() => {
    const params = {}
    if (filters.campaignId) params.campaignId = filters.campaignId
    if (filters.fromDate) params.fromDate = filters.fromDate
    if (filters.toDate) params.toDate = filters.toDate
    callCenterApi.getReport(params).then(setReport)
  }, [filters])

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })

  const exportCsv = () => {
    if (!report) return
    const lines = [['Метрика', 'Вредност']]
    CARDS.forEach(([label, key]) => lines.push([label, report[key]]))
    report.engagementAreaCounts.forEach((a) => lines.push([`Ангажовање: ${a.area}`, a.count]))
    report.topSuggestions.forEach((s) => lines.push([`Сугестија: ${s.suggestion}`, s.count]))
    const csv = lines.map((r) => r.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'izvestaj-kol-centar.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Извештаји</h1>
        <button className="btn-secondary" onClick={exportCsv} disabled={!report}>Извоз CSV</button>
      </div>
      <div className="flex gap-2 mb-4">
        <select className="input" value={filters.campaignId} onChange={set('campaignId')}>
          <option value="">Све кампање</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="input" value={filters.fromDate} onChange={set('fromDate')} />
        <input type="date" className="input" value={filters.toDate} onChange={set('toDate')} />
      </div>
      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {CARDS.map(([label, key]) => (
              <div key={key} className="border rounded p-3">
                <div className="text-2xl font-bold">{report[key]}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          <h2 className="font-medium mb-2">Области ангажовања</h2>
          <table className="w-full text-left mb-6">
            <tbody>{report.engagementAreaCounts.map((a) => (
              <tr key={a.area} className="border-t"><td>{a.area}</td><td>{a.count}</td></tr>
            ))}</tbody>
          </table>
          <h2 className="font-medium mb-2">Најчешће сугестије</h2>
          <table className="w-full text-left">
            <tbody>{report.topSuggestions.map((s, i) => (
              <tr key={i} className="border-t"><td>{s.suggestion}</td><td>{s.count}</td></tr>
            ))}</tbody>
          </table>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build.** Run (from `src/client/MembershipAdmin`): `npm run build` → succeeds.

- [ ] **Step 3: Manual check.** After the Task 15 flow, open `/callcenter/reports`, filter by campaign, confirm the metric cards match the saved outcomes and CSV export downloads.

- [ ] **Step 4: Commit.**

```bash
git add src/client/MembershipAdmin/src/pages/callcenter/CallCenterReports.jsx
git commit -m "feat: add call center reports page"
```

---

## Self-Review Notes (spec coverage)

- **Guided 7-step conditional script** → Task 15 (`CallScript.jsx`) + Task 10 (`callScript.js` flow logic). ✔
- **Step-1 outcomes end the call** → `nextStep('outcome', …)` + backend `SaveOutcomeAsync` short-circuit. ✔
- **Four final statuses** → `ContactFinalStatus` (Task 1) + derivation (Task 8). ✔
- **Imported leads only, CSV/Excel** → Task 6 import service + Task 12 UI. ✔
- **Campaigns** → Tasks 5, 11. ✔
- **Persistent pools, snapshot membership, many operators, built from search** → Tasks 7, 13. ✔
- **Get-next shared queue with soft-claim** → Task 8 `GetNextForOperatorAsync`. ✔
- **Phone auto-suggest + manual link** → Task 8 `SuggestMemberMatchesAsync`/`LinkToMemberAsync`, Task 15 banner. ✔
- **Enroll → pre-filled Add-Member form, store ConvertedMemberId** → Task 8 prefill/converted + Task 15 hand-off. ✔
- **Operator scope = assigned pools** → Task 4 `ApplyCallContactScope`. ✔
- **13 report metrics + export** → Task 9 + Task 16. ✔
- **Data structure fields** (basic + call result + engagement areas + updated data + suggestions) → Task 1 entities. ✔

## Testing note (per project CLAUDE.md)

The main backend has no automated-test project, so this plan verifies via build + migration + manual endpoint/UI checks. Two pure functions are good candidates for unit tests if the team wants to add coverage: `ScopeFilters.ApplyCallContactScope` (Task 4) and `callScript.nextStep` (Task 10). Flag at execution time whether to stand up an xUnit project (backend) / Vitest (frontend) for these.
