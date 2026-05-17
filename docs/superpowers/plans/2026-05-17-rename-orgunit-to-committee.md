# Rename OrgUnit → Committee Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename every occurrence of `OrgUnit` to `Committee` across the entire stack — C# entity, DB table, FK columns, DTOs, services, controller, seeders, frontend page, router, config, translations, and API calls — without losing any data.

**Architecture:** Pure rename — no logic changes. Backend: rename entity class + table attribute + all FKs; add an EF migration with explicit `RenameTable`/`RenameColumn` calls (no drop/recreate). Frontend: rename page file, route, translation namespace, and all API path strings.

**Tech Stack:** .NET 10 / EF Core 10 / SQL Server, React 19 / Vite / i18next

---

## Files to Create / Modify

| File | Action |
|---|---|
| `Middleware/Enums/Enums.cs` | Rename `OrgUnitType` → `CommitteeType` |
| `Middleware/Entities/OrgUnit.cs` | Rename class → `Committee`, update `[Table]`, update self-ref nav |
| `Middleware/Entities/Member.cs` | `OrgUnitId` → `CommitteeId`, nav `OrgUnit` → `Committee` |
| `Middleware/Entities/MemberFunction.cs` | `OrgUnitId` → `CommitteeId`, nav `OrgUnit` → `Committee` |
| `Middleware/Entities/ApplicationUser.cs` | `OrgUnitId` → `CommitteeId`, nav `OrgUnit` → `Committee` |
| `Middleware/Entities/Function.cs` | Property `OrgUnitType` → `CommitteeType` (type `CommitteeType?`) |
| `Middleware/DTOs/OrgUnitDtos.cs` → `CommitteeDtos.cs` | Rename file + all 4 DTO classes |
| `Middleware/DTOs/MemberDtos.cs` | `OrgUnitId`/`OrgUnitName` → `CommitteeId`/`CommitteeName` |
| `Middleware/DTOs/MemberQueryDtos.cs` | `OrgUnitId` → `CommitteeId` |
| `Middleware/DTOs/UserDtos.cs` | `OrgUnitId` → `CommitteeId` |
| `Middleware/DTOs/AuthDtos.cs` | `OrgUnitId` → `CommitteeId` |
| `Middleware/DTOs/FormDTOs.cs` | `OrgUnitId`/`OrgUnitName` → `CommitteeId`/`CommitteeName` |
| `Middleware/DTOs/FunctionDtos.cs` | `OrgUnitType` → `CommitteeType` |
| `Middleware/Data/ApplicationContext.cs` | DbSet `OrgUnits` → `Committees`; update all `modelBuilder.Entity<OrgUnit>` → `<Committee>` |
| `Middleware/Services/IOrgUnitsService.cs` → `ICommitteesService.cs` | Rename file + interface |
| `Middleware/Services/OrgUnitsService.cs` → `CommitteesService.cs` | Rename file + class |
| `Middleware/Services/MembersService.cs` | `OrgUnitId` → `CommitteeId`, `OrgUnit` → `Committee` refs |
| `Middleware/Services/FormsService.cs` | `OrgUnit` → `Committee` refs |
| `Middleware/Services/UsersService.cs` | `OrgUnitId` → `CommitteeId` refs |
| `Middleware/Services/AuthService.cs` | `OrgUnitId` → `CommitteeId` refs |
| `Middleware/Services/DashboardService.cs` | `OrgUnitId` → `CommitteeId`, `OrgUnit` refs |
| `Middleware/Services/ScopeFilters.cs` | `OrgUnitId` → `CommitteeId` refs |
| `Middleware/Services/FunctionsService.cs` | `OrgUnitType` → `CommitteeType` refs |
| `Middleware/Data/OrgUnitsSeeder.cs` → `CommitteesSeeder.cs` | Rename file + class |
| `Middleware/Data/MembersSeeder.cs` | Update all `OrgUnit`/`OrgUnitId`/`OrgUnitType` refs |
| `Middleware/Data/FunctionsSeeder.cs` | `OrgUnitType` → `CommitteeType` |
| `Middleware/Migrations/` | New migration: `RenameToCommittee` |
| `Web/Controllers/Admin/OrgUnitsController.cs` → `CommitteesController.cs` | Rename file + class + route |
| `Web/Controllers/DevController.cs` | Update `OrgUnit`/`OrgUnits` refs |
| `Web/Services/CurrentUser.cs` | `OrgUnitId` → `CommitteeId` |
| `Web/Program.cs` | Update DI registrations |
| `client/src/locales/en/orgUnits.json` → `committees.json` | Rename file |
| `client/src/locales/sr/orgUnits.json` → `committees.json` | Rename file |
| `client/src/framework/i18n.js` | Import `committees` namespace, drop `orgUnits` |
| `client/src/config.js` | `ORG_UNITS_ROLES` → `COMMITTEES_ROLES`, nav item path/label |
| `client/src/services/router.jsx` | Route `/org-units` → `/committees`, import rename |
| `client/src/components/AppSidebar.jsx` | `nav.orgUnits` → `nav.committees` |
| `client/src/locales/en/common.json` | `nav.orgUnits` → `nav.committees` |
| `client/src/locales/sr/common.json` | `nav.orgUnits` → `nav.committees` |
| `client/src/pages/org-units/OrgUnits.jsx` → `committees/Committees.jsx` | Rename + update namespace |
| `client/src/pages/dashboard/OrgUnitsStatsCard.jsx` | API call + `orgUnit` refs |
| `client/src/pages/dashboard/OrgUnitsTable.jsx` | API call + `orgUnit` refs |
| `client/src/pages/dashboard/Dashboard.jsx` | Import name refs |
| `client/src/pages/members/MembersList.jsx` | `/api/orgunits` → `/api/committees`, `orgUnitId` → `committeeId` |
| `client/src/pages/members/MemberForm.jsx` | `/api/orgunits` → `/api/committees`, `orgUnitId` → `committeeId` |
| `client/src/pages/members/MemberDetails.jsx` | `orgUnitId`/`orgUnitName` → `committeeId`/`committeeName` |
| `client/src/pages/forms/FormsList.jsx` | `/api/orgunits` → `/api/committees` |
| `client/src/pages/forms/FormDetails.jsx` | `orgUnitName`/`orgUnitId` refs |
| `client/src/pages/users/Users.jsx` | `/api/orgunits` → `/api/committees`, `orgUnitId` → `committeeId` |

---

### Task 1: Rename enum OrgUnitType → CommitteeType

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs`

- [ ] **Step 1: Rename the enum**

```csharp
// src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs
public enum CommitteeType
{
    City               = 0,
    Municipal          = 1,
    MainCommittee      = 2,
    ExecutiveCommittee = 3,
    Presidency         = 4,
}
```

- [ ] **Step 2: Verify the project doesn't build yet (OrgUnitType references will error)**

```powershell
cd src/backend
dotnet build Marsipan.Membership.sln 2>&1 | Select-String "error"
```
Expected: many errors referencing `OrgUnitType` — confirms the enum was renamed.

- [ ] **Step 3: Commit the enum rename alone**

```bash
git add src/backend/Marsipan.Membership.Middleware/Enums/Enums.cs
git commit -m "refactor: rename OrgUnitType enum to CommitteeType"
```

---

### Task 2: Rename entity OrgUnit → Committee + update related entities

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/OrgUnit.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/Member.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/MemberFunction.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/ApplicationUser.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/Function.cs`

- [ ] **Step 1: Rename OrgUnit entity class and update its own navigation + table attribute**

Replace the full contents of `src/backend/Marsipan.Membership.Middleware/Entities/OrgUnit.cs`:

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Committees")]
public class Committee : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public CommitteeType Type { get; set; }

    public int? ParentId { get; set; }

    [ForeignKey(nameof(ParentId))]
    public Committee? Parent { get; set; }

    public int VoterCount { get; set; }

    public int? MunicipalityId { get; set; }

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality? Municipality { get; set; }

    public int? TrusteeId { get; set; }

    [ForeignKey(nameof(TrusteeId))]
    public Member? Trustee { get; set; }

    public bool IsTrustful { get; set; } = true;

    public int? MaxMembers { get; set; }

    public ICollection<Committee> Children { get; set; } = [];

    public ICollection<Member> Members { get; set; } = [];
}
```

- [ ] **Step 2: Rename the file**

```bash
git mv src/backend/Marsipan.Membership.Middleware/Entities/OrgUnit.cs \
       src/backend/Marsipan.Membership.Middleware/Entities/Committee.cs
```

- [ ] **Step 3: Update Member.cs**

In `src/backend/Marsipan.Membership.Middleware/Entities/Member.cs`, replace the OrgUnit FK block:

```csharp
// before:
public int OrgUnitId { get; set; }
[ForeignKey(nameof(OrgUnitId))]
public OrgUnit OrgUnit { get; set; } = null!;

// after:
public int CommitteeId { get; set; }
[ForeignKey(nameof(CommitteeId))]
public Committee Committee { get; set; } = null!;
```

- [ ] **Step 4: Update MemberFunction.cs**

In `src/backend/Marsipan.Membership.Middleware/Entities/MemberFunction.cs`, replace the OrgUnit FK block:

```csharp
// before:
/// The org unit this function is held in. Null = implied from Member.OrgUnitId (primary local unit).
public int? OrgUnitId { get; set; }
[ForeignKey(nameof(OrgUnitId))]
public OrgUnit? OrgUnit { get; set; }

// after:
/// The committee this function is held in. Null = implied from Member.CommitteeId (primary local committee).
public int? CommitteeId { get; set; }
[ForeignKey(nameof(CommitteeId))]
public Committee? Committee { get; set; }
```

- [ ] **Step 5: Update ApplicationUser.cs**

In `src/backend/Marsipan.Membership.Middleware/Entities/ApplicationUser.cs`, replace:

```csharp
// before:
/// foreign key and navigation to <see cref="OrgUnit"/>.
public int? OrgUnitId { get; set; }
[ForeignKey(nameof(OrgUnitId))]
public OrgUnit? OrgUnit { get; set; }

// after:
public int? CommitteeId { get; set; }
[ForeignKey(nameof(CommitteeId))]
public Committee? Committee { get; set; }
```

- [ ] **Step 6: Update Function.cs**

In `src/backend/Marsipan.Membership.Middleware/Entities/Function.cs`, replace:

```csharp
// before:
public OrgUnitType? OrgUnitType { get; set; }

// after:
public CommitteeType? CommitteeType { get; set; }
```

- [ ] **Step 7: Commit entity changes**

```bash
git add src/backend/Marsipan.Membership.Middleware/Entities/
git commit -m "refactor: rename OrgUnit entity to Committee, update all entity FK properties"
```

---

### Task 3: Rename DTOs

**Files:**
- Modify/Rename: `src/backend/Marsipan.Membership.Middleware/DTOs/OrgUnitDtos.cs` → `CommitteeDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/MemberDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/MemberQueryDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/UserDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/AuthDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/FormDTOs.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/FunctionDtos.cs`

- [ ] **Step 1: Replace OrgUnitDtos.cs with CommitteeDtos.cs**

```bash
git mv src/backend/Marsipan.Membership.Middleware/DTOs/OrgUnitDtos.cs \
       src/backend/Marsipan.Membership.Middleware/DTOs/CommitteeDtos.cs
```

Replace the full file contents:

```csharp
using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public class CommitteeTreeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? MunicipalityId { get; set; }
    public int VoterCount { get; set; }
    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }
    public bool IsTrustful { get; set; }
    public int MemberCount { get; set; }
    public int? MaxMembers { get; set; }
    public List<CommitteeTreeDto> Children { get; set; } = new();
}

public class CommitteeDetailsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CommitteeType Type { get; set; }
    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }
    public int VoterCount { get; set; }
    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }
    public bool IsTrustful { get; set; }
    public int MemberCount { get; set; }
    public int? MaxMembers { get; set; }
}

public class CreateCommitteeDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public CommitteeType Type { get; set; }

    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }
    public bool IsTrustful { get; set; } = true;
    public int? MaxMembers { get; set; }
}

public class UpdateCommitteeDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public CommitteeType Type { get; set; }

    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }
    public bool IsTrustful { get; set; } = true;
    public int? MaxMembers { get; set; }
}
```

- [ ] **Step 2: Update MemberDtos.cs**

In `MemberDtos.cs`, rename every `OrgUnitId` → `CommitteeId` and `OrgUnitName` → `CommitteeName`. (These appear on `MemberListItemDto`, `MemberDetailsDto`, and `CreateMemberDto`/`UpdateMemberDto`.)

- [ ] **Step 3: Update MemberQueryDtos.cs**

Rename `OrgUnitId` → `CommitteeId` in any query/filter DTO.

- [ ] **Step 4: Update UserDtos.cs**

Rename `OrgUnitId` → `CommitteeId` in `UserDto`, `CreateUserDto`, `UpdateUserDto`.

- [ ] **Step 5: Update AuthDtos.cs**

Rename `OrgUnitId` → `CommitteeId` wherever it appears.

- [ ] **Step 6: Update FormDTOs.cs**

Rename `OrgUnitId` → `CommitteeId` and `OrgUnitName` → `CommitteeName` wherever they appear.

- [ ] **Step 7: Update FunctionDtos.cs**

Rename `OrgUnitType` → `CommitteeType` in `FunctionDto` and `CreateFunctionDto`/`UpdateFunctionDto`.

- [ ] **Step 8: Commit DTO changes**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/
git commit -m "refactor: rename OrgUnit DTOs to Committee DTOs"
```

---

### Task 4: Rename service, interface, and ApplicationContext

**Files:**
- Modify/Rename: `Middleware/Services/IOrgUnitsService.cs` → `ICommitteesService.cs`
- Modify/Rename: `Middleware/Services/OrgUnitsService.cs` → `CommitteesService.cs`
- Modify: `Middleware/Data/ApplicationContext.cs`
- Modify: `Middleware/Services/MembersService.cs`
- Modify: `Middleware/Services/FormsService.cs`
- Modify: `Middleware/Services/UsersService.cs`
- Modify: `Middleware/Services/AuthService.cs`
- Modify: `Middleware/Services/DashboardService.cs`
- Modify: `Middleware/Services/ScopeFilters.cs`
- Modify: `Middleware/Services/FunctionsService.cs`
- Modify: `Web/Services/CurrentUser.cs`
- Modify: `Web/Program.cs`

- [ ] **Step 1: Rename interface file and class**

```bash
git mv src/backend/Marsipan.Membership.Middleware/Services/IOrgUnitsService.cs \
       src/backend/Marsipan.Membership.Middleware/Services/ICommitteesService.cs
```

In the file, rename:
- `IOrgUnitsService` → `ICommitteesService`
- All DTO references: `OrgUnitTreeDto` → `CommitteeTreeDto`, `OrgUnitDetailsDto` → `CommitteeDetailsDto`, `CreateOrgUnitDto` → `CreateCommitteeDto`, `UpdateOrgUnitDto` → `UpdateCommitteeDto`

- [ ] **Step 2: Rename service file and class**

```bash
git mv src/backend/Marsipan.Membership.Middleware/Services/OrgUnitsService.cs \
       src/backend/Marsipan.Membership.Middleware/Services/CommitteesService.cs
```

In the file:
- Rename class `OrgUnitsService` → `CommitteesService`
- Implement `ICommitteesService` instead of `IOrgUnitsService`
- Replace all `_db.OrgUnits` → `_db.Committees`
- Replace entity type references `OrgUnit` → `Committee`
- Replace DTO references `OrgUnitTreeDto` → `CommitteeTreeDto`, `OrgUnitDetailsDto` → `CommitteeDetailsDto`
- Replace `OrgUnitType` → `CommitteeType`

- [ ] **Step 3: Update ApplicationContext.cs**

```csharp
// Change DbSet property:
public DbSet<Committee> Committees => Set<Committee>();

// Update all modelBuilder.Entity<OrgUnit>() → modelBuilder.Entity<Committee>()
// Update navigation: .HasOne(o => o.Parent) stays the same (property names on Committee)
// Update: HasOne<OrgUnit>() → HasOne<Committee>() (for Municipality.OoId relationship)
// Update: .HasOne(mf => mf.OrgUnit) → .HasOne(mf => mf.Committee)
//         .HasForeignKey(mf => mf.OrgUnitId) → .HasForeignKey(mf => mf.CommitteeId)
// Update: .HasIndex(mf => new { mf.MemberId, mf.FunctionId, mf.OrgUnitId })
//       → .HasIndex(mf => new { mf.MemberId, mf.FunctionId, mf.CommitteeId })
// Update: .HasOne(o => o.Trustee) → same, just Committee entity
// Update HasQueryFilter: modelBuilder.Entity<OrgUnit>() → modelBuilder.Entity<Committee>()
```

- [ ] **Step 4: Update MembersService.cs**

Global replace in the file:
- `OrgUnitId` → `CommitteeId`
- `OrgUnit` (navigation/entity refs) → `Committee`
- `OrgUnitType` → `CommitteeType`

- [ ] **Step 5: Update remaining services**

In each file do the same global replace of `OrgUnitId` → `CommitteeId`, `OrgUnit` → `Committee`, `OrgUnitType` → `CommitteeType`:
- `FormsService.cs`
- `UsersService.cs`
- `AuthService.cs`
- `DashboardService.cs`
- `ScopeFilters.cs`
- `FunctionsService.cs`
- `CurrentUser.cs`

- [ ] **Step 6: Update Program.cs**

```csharp
// before:
builder.Services.AddScoped<IOrgUnitsService, OrgUnitsService>();

// after:
builder.Services.AddScoped<ICommitteesService, CommitteesService>();
```

- [ ] **Step 7: Build and verify no compile errors**

```powershell
cd src/backend
dotnet build Marsipan.Membership.sln
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/ \
        src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs \
        src/backend/Marsipan.Membership.Web/Services/CurrentUser.cs \
        src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "refactor: rename OrgUnitsService → CommitteesService, update ApplicationContext and all service references"
```

---

### Task 5: Rename controller and update DevController

**Files:**
- Modify/Rename: `Web/Controllers/Admin/OrgUnitsController.cs` → `CommitteesController.cs`
- Modify: `Web/Controllers/DevController.cs`

- [ ] **Step 1: Rename controller file**

```bash
git mv src/backend/Marsipan.Membership.Web/Controllers/Admin/OrgUnitsController.cs \
       src/backend/Marsipan.Membership.Web/Controllers/Admin/CommitteesController.cs
```

In the file:
- Rename class `OrgUnitsController` → `CommitteesController`
- Change route: `[Route("api/orgunits")]` → `[Route("api/committees")]`
- Inject `ICommitteesService` instead of `IOrgUnitsService`
- Replace all DTO references: `OrgUnitTreeDto` → `CommitteeTreeDto`, `OrgUnitDetailsDto` → `CommitteeDetailsDto`, `CreateOrgUnitDto` → `CreateCommitteeDto`, `UpdateOrgUnitDto` → `UpdateCommitteeDto`
- Update error message: `"OrgUnit has non-deleted children..."` → `"Committee has non-deleted children..."`

- [ ] **Step 2: Update DevController.cs**

In `DevController.cs`, replace:
- `OrgUnit` entity/navigation references → `Committee`
- `OrgUnitId` → `CommitteeId`
- String literals like `"DELETE FROM [OrgUnits]"` → `"DELETE FROM [Committees]"`
- `UPDATE [OrgUnits]` → `UPDATE [Committees]`

- [ ] **Step 3: Build and verify**

```powershell
cd src/backend
dotnet build Marsipan.Membership.sln
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/backend/Marsipan.Membership.Web/Controllers/
git commit -m "refactor: rename OrgUnitsController → CommitteesController, route api/orgunits → api/committees"
```

---

### Task 6: EF Core migration — rename table and FK columns

**Files:**
- Create: `Middleware/Migrations/<timestamp>_RenameToCommittee.cs` (via `dotnet ef migrations add`)

- [ ] **Step 1: Add the migration scaffold**

```powershell
dotnet ef migrations add RenameToCommittee `
  --project src/backend/Marsipan.Membership.Middleware `
  --startup-project src/backend/Marsipan.Membership.Web
```

- [ ] **Step 2: Open the generated migration and replace the Up/Down methods**

EF will generate a drop/recreate. Replace the `Up` method with explicit renames:

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    // 1. Rename the OrgUnits table to Committees
    migrationBuilder.RenameTable(
        name: "OrgUnits",
        newName: "Committees");

    // 2. Rename FK columns on Members
    migrationBuilder.RenameColumn(
        name: "OrgUnitId",
        table: "Members",
        newName: "CommitteeId");
    migrationBuilder.RenameIndex(
        name: "IX_Members_OrgUnitId",
        table: "Members",
        newName: "IX_Members_CommitteeId");

    // 3. Rename FK columns on AspNetUsers
    migrationBuilder.RenameColumn(
        name: "OrgUnitId",
        table: "AspNetUsers",
        newName: "CommitteeId");
    migrationBuilder.RenameIndex(
        name: "IX_AspNetUsers_OrgUnitId",
        table: "AspNetUsers",
        newName: "IX_AspNetUsers_CommitteeId");

    // 4. Rename FK columns on MemberFunctions
    migrationBuilder.RenameColumn(
        name: "OrgUnitId",
        table: "MemberFunctions",
        newName: "CommitteeId");
    migrationBuilder.RenameIndex(
        name: "IX_MemberFunctions_OrgUnitId",
        table: "MemberFunctions",
        newName: "IX_MemberFunctions_CommitteeId");
    migrationBuilder.RenameIndex(
        name: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId",
        table: "MemberFunctions",
        newName: "IX_MemberFunctions_MemberId_FunctionId_CommitteeId");

    // 5. Rename OrgUnitType column on Functions to CommitteeType
    migrationBuilder.RenameColumn(
        name: "OrgUnitType",
        table: "Functions",
        newName: "CommitteeType");
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.RenameColumn(
        name: "CommitteeType",
        table: "Functions",
        newName: "OrgUnitType");

    migrationBuilder.RenameIndex(
        name: "IX_MemberFunctions_MemberId_FunctionId_CommitteeId",
        table: "MemberFunctions",
        newName: "IX_MemberFunctions_MemberId_FunctionId_OrgUnitId");
    migrationBuilder.RenameIndex(
        name: "IX_MemberFunctions_CommitteeId",
        table: "MemberFunctions",
        newName: "IX_MemberFunctions_OrgUnitId");
    migrationBuilder.RenameColumn(
        name: "CommitteeId",
        table: "MemberFunctions",
        newName: "OrgUnitId");

    migrationBuilder.RenameIndex(
        name: "IX_AspNetUsers_CommitteeId",
        table: "AspNetUsers",
        newName: "IX_AspNetUsers_OrgUnitId");
    migrationBuilder.RenameColumn(
        name: "CommitteeId",
        table: "AspNetUsers",
        newName: "OrgUnitId");

    migrationBuilder.RenameIndex(
        name: "IX_Members_CommitteeId",
        table: "Members",
        newName: "IX_Members_OrgUnitId");
    migrationBuilder.RenameColumn(
        name: "CommitteeId",
        table: "Members",
        newName: "OrgUnitId");

    migrationBuilder.RenameTable(
        name: "Committees",
        newName: "OrgUnits");
}
```

> **Note:** Verify the exact index names by checking the previous migration's `Designer.cs` or running `SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID('MemberFunctions')` against the local DB. Adjust if different.

- [ ] **Step 3: Apply the migration**

```powershell
dotnet ef database update `
  --project src/backend/Marsipan.Membership.Middleware `
  --startup-project src/backend/Marsipan.Membership.Web
```
Expected: "Done."

- [ ] **Step 4: Start the backend and verify health**

```bash
cd src/backend/Marsipan.Membership.Web && dotnet run --launch-profile http
curl http://localhost:5145/health   # → "ok"
curl http://localhost:5145/api/committees   # → JSON array
```

- [ ] **Step 5: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Migrations/
git commit -m "refactor: EF migration — rename OrgUnits table and FK columns to Committees/CommitteeId"
```

---

### Task 7: Rename seeders

**Files:**
- Modify/Rename: `Middleware/Data/OrgUnitsSeeder.cs` → `CommitteesSeeder.cs`
- Modify: `Middleware/Data/MembersSeeder.cs`
- Modify: `Middleware/Data/FunctionsSeeder.cs`
- Modify: `Web/Program.cs`

- [ ] **Step 1: Rename OrgUnitsSeeder**

```bash
git mv src/backend/Marsipan.Membership.Middleware/Data/OrgUnitsSeeder.cs \
       src/backend/Marsipan.Membership.Middleware/Data/CommitteesSeeder.cs
```

In the file:
- Rename class `OrgUnitsSeeder` → `CommitteesSeeder`
- Replace all `OrgUnit` entity refs → `Committee`
- Replace `OrgUnitType` → `CommitteeType`
- Replace `db.OrgUnits` → `db.Committees`

- [ ] **Step 2: Update MembersSeeder.cs**

Global replace:
- `OrgUnitType` → `CommitteeType`
- `OrgUnitId` → `CommitteeId`
- `db.OrgUnits` → `db.Committees`
- `OrgUnit` (entity refs) → `Committee`

- [ ] **Step 3: Update FunctionsSeeder.cs**

Replace `OrgUnitType` → `CommitteeType` in the JSON field mapping.

- [ ] **Step 4: Update functions.json**

In `Middleware/Data/SeedData/functions.json`, rename the key `orgUnitType` → `committeeType` in each entry (the JSON key must match what `FunctionsSeeder` reads).

- [ ] **Step 5: Update Program.cs seeder calls**

```csharp
// before:
await OrgUnitsSeeder.SeedAsync(dbContext, systemUserId);

// after:
await CommitteesSeeder.SeedAsync(dbContext, systemUserId);
```

- [ ] **Step 6: Build and verify**

```powershell
cd src/backend
dotnet build Marsipan.Membership.sln
```
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Data/ \
        src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "refactor: rename OrgUnitsSeeder → CommitteesSeeder, update all seeder OrgUnit refs"
```

---

### Task 8: Frontend — rename translation files and update i18n

**Files:**
- Rename: `client/src/locales/en/orgUnits.json` → `committees.json`
- Rename: `client/src/locales/sr/orgUnits.json` → `committees.json`
- Modify: `client/src/framework/i18n.js`
- Modify: `client/src/locales/en/common.json`
- Modify: `client/src/locales/sr/common.json`

- [ ] **Step 1: Rename translation files**

```bash
git mv src/client/MembershipAdmin/src/locales/en/orgUnits.json \
       src/client/MembershipAdmin/src/locales/en/committees.json
git mv src/client/MembershipAdmin/src/locales/sr/orgUnits.json \
       src/client/MembershipAdmin/src/locales/sr/committees.json
```

- [ ] **Step 2: Update orgUnit keys in both committees.json files**

In `en/committees.json`, update text strings:
- `"title": "Committees"` (was "Org Units")
- `"addCity": "Add City Committee"` (was "Add City")
- `"addMunicipal": "Add Municipal Committee"` (was "Add Municipal")
- `"state.noOrgUnits"` key → `"state.noCommittees": "No committees found."`
- `"state.loadFailed"` → `"state.loadFailed": "Failed to load committees."`
- `"error.saveFailed"` → `"Failed to save committee."`
- `"error.deleteFailed"` → `"Failed to delete committee."`
- `"error.deleteRestricted"` → `"Cannot delete — has child committees or members."`
- `"toast.created"` → `"Committee created."`
- `"toast.saved"` → `"Changes saved."`
- `"toast.deleted"` → `"Committee deleted."`
- `"modal.addChildTitle"` → `"Add child committee under \"{{parentName}}\""`
- `"modal.addRootTitle"` → `"Add root committee"`
- `"modal.editTitle"` → `"Edit committee"`
- `"filter.noResults"` → `"No results for the given name."`

In `sr/committees.json`, update accordingly (keep existing Serbian text but change "орг. јединица"  → "одбор/комитет" where appropriate — use "одбор" as the Serbian for committee in this context):
- `"title"` → `"Одбори"`
- `"state.noOrgUnits"` key → `"state.noCommittees"`: `"Нема одбора."`
- Toast messages: update to reference "одбор"

- [ ] **Step 3: Update common.json nav key**

In `en/common.json`, rename:
```json
"nav": {
  "committees": "Committees"
}
```
(was `"orgUnits": "Org Units"`)

In `sr/common.json`:
```json
"nav": {
  "committees": "Одбори"
}
```
(was `"orgUnits": "Орг. јединице"`)

- [ ] **Step 4: Update i18n.js**

```js
// Replace:
import enOrgUnits from '../locales/en/orgUnits.json'
import srOrgUnits from '../locales/sr/orgUnits.json'

// With:
import enCommittees from '../locales/en/committees.json'
import srCommittees from '../locales/sr/committees.json'

// In resources:
en: {
  // remove orgUnits entry, add:
  committees: enCommittees,
}
sr: {
  // remove orgUnits entry, add:
  committees: srCommittees,
}

// In ns array:
ns: ['common', 'auth', 'dashboard', 'members', 'forms', 'committees', 'functions', 'users', 'profile', 'enums'],
```

- [ ] **Step 5: Commit**

```bash
git add src/client/MembershipAdmin/src/locales/ \
        src/client/MembershipAdmin/src/framework/i18n.js
git commit -m "refactor: rename orgUnits translation namespace to committees"
```

---

### Task 9: Frontend — rename page, update router and config

**Files:**
- Rename/Modify: `client/src/pages/org-units/OrgUnits.jsx` → `committees/Committees.jsx`
- Modify: `client/src/services/router.jsx`
- Modify: `client/src/config.js`
- Modify: `client/src/components/AppSidebar.jsx`
- Modify: `client/src/pages/dashboard/OrgUnitsStatsCard.jsx`
- Modify: `client/src/pages/dashboard/OrgUnitsTable.jsx`
- Modify: `client/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Rename the page file and directory**

```bash
mkdir -p src/client/MembershipAdmin/src/pages/committees
git mv src/client/MembershipAdmin/src/pages/org-units/OrgUnits.jsx \
       src/client/MembershipAdmin/src/pages/committees/Committees.jsx
```

- [ ] **Step 2: Update translation namespace inside Committees.jsx**

In `Committees.jsx`, replace every `useTranslation('orgUnits')` or `t('orgUnits:...)` with `useTranslation('committees')` / `t('committees:...)`.

Also replace API call: `api.get('/api/orgunits')` → `api.get('/api/committees')`, and all `api.post/put/delete('/api/orgunits...')` → `/api/committees...`.

Replace `const TYPE_CITY = 'City'` / `const TYPE_MUNICIPAL = 'Municipal'` — these stay the same (they are CommitteeType string values, not changed).

Replace any `orgUnit` variable names with `committee` for clarity (optional but recommended).

- [ ] **Step 3: Update router.jsx**

```js
// Remove:
import OrgUnits from '../pages/org-units/OrgUnits'

// Add:
import Committees from '../pages/committees/Committees'

// Remove:
import { ORG_UNITS_ROLES, ... } from '../config'

// Add:
import { COMMITTEES_ROLES, ... } from '../config'

// Replace route:
// before:
<Route path="/org-units" element={guarded(<OrgUnits />, ORG_UNITS_ROLES)} />

// after:
<Route path="/committees" element={guarded(<Committees />, COMMITTEES_ROLES)} />
```

- [ ] **Step 4: Update config.js**

```js
// before:
export const ORG_UNITS_ROLES = [ROLES.SuperAdmin]

{ to: '/org-units', label: 'Org Units', roles: ORG_UNITS_ROLES, iconName: 'building', section: 'main' },

// after:
export const COMMITTEES_ROLES = [ROLES.SuperAdmin]

{ to: '/committees', label: 'Committees', roles: COMMITTEES_ROLES, iconName: 'building', section: 'main' },
```

- [ ] **Step 5: Update AppSidebar.jsx**

Replace the nav translation key reference:
```js
// before:
building: 'nav.orgUnits',

// after:
building: 'nav.committees',
```

- [ ] **Step 6: Update dashboard files**

In `OrgUnitsStatsCard.jsx`:
- Replace `api.get('/api/orgunits')` → `api.get('/api/committees')`
- Replace `orgUnit` variable names → `committee`

In `OrgUnitsTable.jsx`:
- Replace `api.get('/api/orgunits')` → `api.get('/api/committees')`
- Replace `orgUnit` variable names → `committee`

In `Dashboard.jsx`:
- Update any import name references if files are renamed.

- [ ] **Step 7: Verify the frontend dev server starts without errors**

```bash
cd src/client/MembershipAdmin && npm run dev
```
Open http://localhost:5180 — navigate to /committees and verify the page loads.

- [ ] **Step 8: Commit**

```bash
git add src/client/MembershipAdmin/src/
git commit -m "refactor: rename org-units page to committees, update route /org-units → /committees"
```

---

### Task 10: Frontend — update all other pages referencing orgUnit

**Files:**
- Modify: `client/src/pages/members/MembersList.jsx`
- Modify: `client/src/pages/members/MemberForm.jsx`
- Modify: `client/src/pages/members/MemberDetails.jsx`
- Modify: `client/src/pages/forms/FormsList.jsx`
- Modify: `client/src/pages/forms/FormDetails.jsx`
- Modify: `client/src/pages/users/Users.jsx`
- Modify: `client/src/pages/profile/Profile.jsx`

- [ ] **Step 1: Update MembersList.jsx**

Replace:
- `orgUnitId` → `committeeId` (query param and state)
- `orgUnitName` → `committeeName` (display)
- `api.get('/api/orgunits')` → `api.get('/api/committees')`

- [ ] **Step 2: Update MemberForm.jsx**

Replace:
- `api.get('/api/orgunits')` → `api.get('/api/committees')`
- `orgUnitId` → `committeeId` in form values, register calls, and payload
- `orgUnitName` → `committeeName` where used

- [ ] **Step 3: Update MemberDetails.jsx**

Replace:
- `orgUnitId` / `orgUnitName` → `committeeId` / `committeeName`
- Any `/api/orgunits` call → `/api/committees`

- [ ] **Step 4: Update FormsList.jsx**

Replace:
- `api.get('/api/orgunits')` → `api.get('/api/committees')`
- `orgUnitId` → `committeeId` in filter params

- [ ] **Step 5: Update FormDetails.jsx**

Replace:
- `orgUnitId` / `orgUnitName` → `committeeId` / `committeeName` in displayed data
- Any `/api/orgunits` call → `/api/committees`

- [ ] **Step 6: Update Users.jsx**

Replace:
- `api.get('/api/orgunits')` → `api.get('/api/committees')`
- `orgUnitId` → `committeeId` in form fields and API payloads

- [ ] **Step 7: Update Profile.jsx**

Replace any `orgUnitId` / `orgUnitName` display references.

- [ ] **Step 8: Build the client and check for errors**

```bash
cd src/client/MembershipAdmin && npm run build
```
Expected: Build succeeded, 0 errors.

- [ ] **Step 9: Manual smoke test**

1. Navigate to http://localhost:5180/committees — page loads, committee tree visible
2. Navigate to /members — member list shows committee name column
3. Open a member detail — committee name displayed
4. Open /forms — org unit filter shows committees
5. Open /users — committee dropdown populated

- [ ] **Step 10: Commit**

```bash
git add src/client/MembershipAdmin/src/pages/
git commit -m "refactor: update all frontend pages to use committeeId/committeeName and /api/committees"
```

---

## Verification Checklist

After all tasks complete:

- [ ] `dotnet build Marsipan.Membership.sln` → 0 errors
- [ ] `npm run build` → 0 errors
- [ ] `GET /api/committees` → returns committee tree JSON
- [ ] `GET /api/committees/{id}` → returns single committee
- [ ] `/committees` page loads in browser
- [ ] Members list shows `committeeName`
- [ ] Creating a member works (`CommitteeId` FK saves correctly)
- [ ] No `OrgUnit` references remain in non-migration backend files:
  ```powershell
  grep -r "OrgUnit" src/backend --include="*.cs" --exclude-dir=Migrations
  ```
  Expected: 0 results
- [ ] No `orgUnit` references remain in frontend source:
  ```bash
  grep -r "orgUnit\|OrgUnit\|orgunits\|org-units" src/client/MembershipAdmin/src --include="*.jsx" --include="*.js" --include="*.json"
  ```
  Expected: 0 results
