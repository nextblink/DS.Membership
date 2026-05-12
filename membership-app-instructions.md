# Political Party Membership App — Claude Code Instructions

## Project Overview

Build a full-stack web application for managing political party membership records.

- **Backend:** .NET 9 Web API + Entity Framework Core + ASP.NET Core Identity + JWT
- **Frontend:** React SPA (Vite)
- **Database:** SQL Server
- **Auth:** JWT Bearer tokens with role-based access control

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | .NET 9 Web API |
| ORM | Entity Framework Core 9 |
| Auth | ASP.NET Core Identity + JWT |
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| HTTP Client | Axios |
| State | React Context / useState |
| Routing | React Router v6 |

---

## Roles & Permissions

| Role | Members | Forms | Org Units | Functions | Users |
|------|---------|-------|-----------|-----------|-------|
| `SuperAdmin` | All CRUD | All CRUD + Verify | CRUD | CRUD | CRUD |
| `Admin` | All CRUD | All CRUD + Verify | Read | Read | - |
| `LocalAdmin` | Own unit CRUD | Own unit CRUD + Verify | Read | Read | - |
| `Operator` | Own unit CRUD | Own uploaded only CRUD | - | - | - |
| `Viewer` | Own unit Read | - | - | - | - |

**Scope rules:**
- `SuperAdmin`, `Admin` — no unit filter
- `LocalAdmin`, `Operator`, `Viewer` — filtered by their assigned `OrgUnitId`
- `Operator` — for Forms, filtered additionally by `CreatedByUserId`

---

## Database Models

### Enums

```csharp
public enum Gender { Male, Female }
public enum MaritalStatus { Single, Married, Divorced, Widowed }
public enum EducationLevel { Primary, Secondary, Higher, University, Masters, Doctorate }
public enum PhoneType { Mobile, Landline, Business }
public enum OrgUnitType { City, Municipal }
public enum FormStatus { Pending, Verified, Rejected }
```

### Entities

```csharp
// ApplicationUser extends IdentityUser
public class ApplicationUser : IdentityUser
{
    public int? OrgUnitId { get; set; }
    public OrgUnit? OrgUnit { get; set; }
}

[Table("OrgUnits")]
public class OrgUnit
{
    [Key] public int Id { get; set; }
    [Required, MaxLength(200)] public string Name { get; set; } = null!;
    [Required] public OrgUnitType Type { get; set; }
    public int? ParentId { get; set; }
    [ForeignKey(nameof(ParentId))] public OrgUnit? Parent { get; set; }
    public int VoterCount { get; set; }  // for % membership calculation
    public ICollection<OrgUnit> Children { get; set; } = [];
    public ICollection<Member> Members { get; set; } = [];
}

[Table("Functions")]
public class Function
{
    [Key] public int Id { get; set; }
    [Required, MaxLength(200)] public string Name { get; set; } = null!;
    public ICollection<MemberFunction> MemberFunctions { get; set; } = [];
}

[Table("Members")]
public class Member
{
    [Key] public int Id { get; set; }
    [Required, MaxLength(100)] public string FirstName { get; set; } = null!;
    [Required, MaxLength(100)] public string LastName { get; set; } = null!;
    [MaxLength(100)] public string? ParentName { get; set; }
    [Required] public DateOnly DateOfBirth { get; set; }
    [Required, MaxLength(13), MinLength(13)] public string JMBG { get; set; } = null!;
    [Required] public Gender Gender { get; set; }
    [MaxLength(10)] public string? PostalCode { get; set; }
    [MaxLength(50)] public string? IdCardNumber { get; set; }
    [MaxLength(200)] public string? City { get; set; }
    [MaxLength(200), EmailAddress] public string? Email { get; set; }
    [Required] public MaritalStatus MaritalStatus { get; set; }
    public int? VotingPlaceNumber { get; set; }
    [Required] public EducationLevel EducationLevel { get; set; }
    [MaxLength(200)] public string? CompanyName { get; set; }
    [MaxLength(200)] public string? CompanyCity { get; set; }
    public bool IsPublicCompany { get; set; } = false;
    [MaxLength(200)] public string? JobTitle { get; set; }
    [MaxLength(200)] public string? Occupation { get; set; }
    [Required] public DateOnly MembershipDate { get; set; }
    [Required] public int OrgUnitId { get; set; }
    [ForeignKey(nameof(OrgUnitId))] public OrgUnit OrgUnit { get; set; } = null!;
    public ICollection<Phone> Phones { get; set; } = [];
    public ICollection<MemberFunction> MemberFunctions { get; set; } = [];
    public ICollection<Form> Forms { get; set; } = [];
}

[Table("Phones")]
public class Phone
{
    [Key] public int Id { get; set; }
    [Required, MaxLength(30)] public string Number { get; set; } = null!;
    [Required] public PhoneType Type { get; set; }
    [Required] public int MemberId { get; set; }
    [ForeignKey(nameof(MemberId))] public Member Member { get; set; } = null!;
}

[Table("MemberFunctions")]
public class MemberFunction
{
    [Key] public int Id { get; set; }
    [Required] public int MemberId { get; set; }
    [ForeignKey(nameof(MemberId))] public Member Member { get; set; } = null!;
    [Required] public int FunctionId { get; set; }
    [ForeignKey(nameof(FunctionId))] public Function Function { get; set; } = null!;
    [Required] public DateOnly AssignedDate { get; set; }
}

[Table("Forms")]
public class Form
{
    [Key] public int Id { get; set; }
    [MaxLength(50)] public string? FormNumber { get; set; }
    public DateOnly? FormDate { get; set; }
    [MaxLength(200)] public string? MunicipalBoard { get; set; }
    public int? MemberId { get; set; }
    [ForeignKey(nameof(MemberId))] public Member? Member { get; set; }
    [Required] public DateOnly ScanDate { get; set; }
    [Required] public FormStatus Status { get; set; } = FormStatus.Pending;
    [Required, MaxLength(450)] public string CreatedByUserId { get; set; } = null!;
    [ForeignKey(nameof(CreatedByUserId))] public ApplicationUser CreatedBy { get; set; } = null!;
    public ICollection<FormImage> Images { get; set; } = [];
}

[Table("FormImages")]
public class FormImage
{
    [Key] public int Id { get; set; }
    [Required] public int FormId { get; set; }
    [ForeignKey(nameof(FormId))] public Form Form { get; set; } = null!;
    [Required, MaxLength(255)] public string FileName { get; set; } = null!;
    [Required, MaxLength(500)] public string FilePath { get; set; } = null!;
    [Required] public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public int Order { get; set; } = 0;
}
```

### DbContext with Seed Data

```csharp
public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<OrgUnit> OrgUnits => Set<OrgUnit>();
    public DbSet<Function> Functions => Set<Function>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Phone> Phones => Set<Phone>();
    public DbSet<MemberFunction> MemberFunctions => Set<MemberFunction>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormImage> FormImages => Set<FormImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Member>()
            .HasIndex(m => m.JMBG).IsUnique();

        modelBuilder.Entity<OrgUnit>()
            .HasOne(o => o.Parent)
            .WithMany(o => o.Children)
            .HasForeignKey(o => o.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed Functions
        modelBuilder.Entity<Function>().HasData(
            new Function { Id = 1, Name = "Member OB" },
            new Function { Id = 2, Name = "President" },
            new Function { Id = 3, Name = "Vice President" },
            new Function { Id = 4, Name = "Secretary" },
            new Function { Id = 5, Name = "Treasurer" },
            new Function { Id = 6, Name = "Member EC" }
        );

        // Seed OrgUnits
        modelBuilder.Entity<OrgUnit>().HasData(
            new OrgUnit { Id = 1, Name = "Belgrade", Type = OrgUnitType.City, ParentId = null, VoterCount = 0 },
            new OrgUnit { Id = 2, Name = "Lazarevac", Type = OrgUnitType.Municipal, ParentId = 1, VoterCount = 0 },
            new OrgUnit { Id = 3, Name = "Novi Sad", Type = OrgUnitType.City, ParentId = null, VoterCount = 0 }
        );

        // Seed Roles
        modelBuilder.Entity<IdentityRole>().HasData(
            new IdentityRole { Id = "1", Name = "SuperAdmin", NormalizedName = "SUPERADMIN" },
            new IdentityRole { Id = "2", Name = "Admin", NormalizedName = "ADMIN" },
            new IdentityRole { Id = "3", Name = "LocalAdmin", NormalizedName = "LOCALADMIN" },
            new IdentityRole { Id = "4", Name = "Operator", NormalizedName = "OPERATOR" },
            new IdentityRole { Id = "5", Name = "Viewer", NormalizedName = "VIEWER" }
        );
    }
}
```

---

## API Endpoints

### Auth
```
POST   /api/auth/login          → { token, user: { id, email, role, orgUnitId } }
POST   /api/auth/logout
GET    /api/auth/me
```

### Members
```
GET    /api/members             → paged list, filters: firstName, lastName, jmbg, orgUnitId, functionId, educationLevel, occupation
GET    /api/members/{id}
POST   /api/members
PUT    /api/members/{id}
DELETE /api/members/{id}
```

### Phones (nested under member)
```
POST   /api/members/{id}/phones
DELETE /api/members/{memberId}/phones/{phoneId}
```

### Member Functions (nested under member)
```
GET    /api/members/{id}/functions
POST   /api/members/{id}/functions
DELETE /api/members/{memberId}/functions/{mfId}
```

### Forms
```
GET    /api/forms               → paged list, filters: formNumber, orgUnitId, status, memberName
GET    /api/forms/{id}
POST   /api/forms               → multipart/form-data (metadata + images)
PUT    /api/forms/{id}
DELETE /api/forms/{id}
PATCH  /api/forms/{id}/status   → { status: "Verified" | "Rejected" } — roles: SuperAdmin, Admin, LocalAdmin
POST   /api/forms/{id}/images   → upload additional images
DELETE /api/forms/{formId}/images/{imageId}
```

### OrgUnits
```
GET    /api/orgunits            → tree structure
GET    /api/orgunits/{id}
POST   /api/orgunits            → SuperAdmin only
PUT    /api/orgunits/{id}       → SuperAdmin only
DELETE /api/orgunits/{id}       → SuperAdmin only
```

### Functions (lookup)
```
GET    /api/functions
POST   /api/functions           → SuperAdmin only
PUT    /api/functions/{id}      → SuperAdmin only
DELETE /api/functions/{id}      → SuperAdmin only
```

### Users
```
GET    /api/users               → SuperAdmin only
GET    /api/users/{id}          → SuperAdmin only
POST   /api/users               → SuperAdmin only
PUT    /api/users/{id}          → SuperAdmin only
DELETE /api/users/{id}          → SuperAdmin only
```

### Dashboard
```
GET    /api/dashboard/stats     → { totalMembers, membersByOrgUnit: [{ orgUnitId, name, memberCount, voterCount, percentage }], formsByStatus: { pending, verified, rejected } }
```

---

## File Storage

- Images stored locally at: `wwwroot/uploads/forms/{formId}/{fileName}`
- Served via static files middleware
- Accepted types: jpg, jpeg, png, webp, pdf
- Max file size: 10MB per image

---

## Frontend Pages & Routes

### Route Structure

```
/login                          → public

/dashboard                      → SuperAdmin, Admin, LocalAdmin
/members                        → list with search/filter
/members/new                    → create form
/members/:id                    → details view
/members/:id/edit               → edit form
/forms                          → list with search/filter
/forms/new                      → upload form
/forms/:id                      → details + image viewer + status actions
/org-units                      → tree view — SuperAdmin only
/functions                      → CRUD list — SuperAdmin only
/users                          → user management — SuperAdmin only
/profile                        → all roles
```

### Page Descriptions

#### Login `/login`
- Email + password fields
- JWT stored in localStorage
- Redirect to `/dashboard` on success

#### Dashboard `/dashboard`
- Total member count (big number card)
- Table: OrgUnit | Member Count | Voter Count | % Membership
- Donut/bar chart: Forms by status (Pending / Verified / Rejected)
- Visible to: SuperAdmin, Admin, LocalAdmin

#### Members List `/members`
- Search filters: First Name, Last Name, JMBG, Org Unit (dropdown), Function (dropdown), Education Level (dropdown), Occupation (text)
- Table columns: Full Name, JMBG, Org Unit, Membership Date, Functions
- Pagination
- "Add Member" button → `/members/new`
- Row click → `/members/:id`

#### Member Create/Edit `/members/new` and `/members/:id/edit`
Form sections:
1. **Personal** — FirstName, LastName, ParentName, DateOfBirth, JMBG, Gender, MaritalStatus
2. **Contact** — PostalCode, City, Email, Phones (add/remove rows with type dropdown)
3. **Membership** — OrgUnit, MembershipDate, VotingPlaceNumber, Functions (multi-select with date)
4. **Employment** — Occupation, JobTitle, CompanyName, CompanyCity, IsPublicCompany checkbox
5. **Education** — EducationLevel dropdown

#### Member Details `/members/:id`
- Read-only view of all fields
- Edit and Delete buttons (role-dependent)
- List of linked forms

#### Forms List `/forms`
- Search filters: Form Number, Org Unit, Status (dropdown), Member Name
- Table columns: Form Number, Member Name, Org Unit, Scan Date, Status (badge), Uploaded By
- Operator sees only their own uploads
- "Upload Form" button → `/forms/new`

#### Form Upload `/forms/new`
- FormNumber, FormDate, MunicipalBoard (text inputs)
- Member search/link (optional — typeahead search by name/JMBG)
- Image upload: drag & drop, multiple files, preview thumbnails, reorder

#### Form Details `/forms/:id`
- Metadata display
- Image carousel/gallery viewer (fullscreen support)
- Status badge with Verify / Reject buttons (SuperAdmin, Admin, LocalAdmin only)
- Linked member card (clickable)

#### Org Units `/org-units`
- Tree view showing City → Municipal hierarchy
- Each node: Name, Type, VoterCount (editable inline)
- Add child unit button on each node
- SuperAdmin only

#### Functions `/functions`
- Simple table list
- Inline add/edit/delete
- SuperAdmin only

#### Users `/users`
- Table: Email, Role, Org Unit, Actions
- Create user modal: Email, Password, Role, OrgUnit (required for LocalAdmin/Operator/Viewer)
- Edit role and OrgUnit
- SuperAdmin only

#### Profile `/profile`
- Display current user info
- Change password form

---

## Search & Filtering

All list pages use query params for filters, enabling shareable URLs:
```
/members?firstName=Milos&orgUnitId=2&page=1&pageSize=20
/forms?status=Pending&orgUnitId=2&page=1&pageSize=20
```

Backend returns:
```json
{
  "items": [...],
  "totalCount": 150,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8
}
```

---

## Authorization Rules Summary

### Backend (applied via policy or manual check in controllers)

```csharp
// Scope filter helper — add to base controller or service
private IQueryable<Member> ApplyScopeFilter(IQueryable<Member> query)
{
    if (User.IsInRole("SuperAdmin") || User.IsInRole("Admin"))
        return query;

    var orgUnitId = GetCurrentUserOrgUnitId();
    return query.Where(m => m.OrgUnitId == orgUnitId);
}

// Form scope filter
private IQueryable<Form> ApplyFormScopeFilter(IQueryable<Form> query)
{
    if (User.IsInRole("SuperAdmin") || User.IsInRole("Admin"))
        return query;

    if (User.IsInRole("Operator"))
        return query.Where(f => f.CreatedByUserId == CurrentUserId);

    var orgUnitId = GetCurrentUserOrgUnitId();
    return query.Where(f => f.Member!.OrgUnitId == orgUnitId);
}
```

### Frontend (React route guards)

```jsx
// Protect routes by role
<ProtectedRoute roles={["SuperAdmin"]} element={<UsersPage />} />
<ProtectedRoute roles={["SuperAdmin", "Admin", "LocalAdmin"]} element={<DashboardPage />} />
```

---

## Project Structure

### Backend
```
/src
  /Api
    /Controllers
      AuthController.cs
      MembersController.cs
      FormsController.cs
      OrgUnitsController.cs
      FunctionsController.cs
      UsersController.cs
      DashboardController.cs
    /DTOs
    /Services
    /Models
    /Enums
    /Data
      AppDbContext.cs
    Program.cs
```

### Frontend
```
/src
  /api          → axios instances + API call functions
  /components   → shared UI components
  /pages        → one folder per page
  /context      → AuthContext
  /hooks        → useAuth, usePagination, etc.
  /types        → TypeScript interfaces
  App.tsx
  main.tsx
```

---

## Key Implementation Notes

1. **JWT** — include `role` and `orgUnitId` claims in token
2. **Image serving** — configure `app.UseStaticFiles()` with `wwwroot/uploads`
3. **CORS** — allow React dev server origin
4. **Pagination** — all list endpoints must be paged
5. **Soft delete** — not required, hard delete is fine
6. **Validation** — use FluentValidation or Data Annotations on DTOs
7. **JMBG uniqueness** — enforced at DB level (unique index) and API level (409 Conflict)
8. **Form images order** — `Order` field on `FormImage` allows drag-and-drop reordering
9. **VoterCount** — stored on `OrgUnit`, editable by SuperAdmin; used for dashboard % calculation
10. **CreatedByUserId** — set server-side from JWT claims, never from client input
