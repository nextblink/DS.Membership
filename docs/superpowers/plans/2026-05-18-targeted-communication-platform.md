# Targeted Communication Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add member-driven committee broadcasts and ad-hoc event groups to the Marcipano Telegram Mini App, so trustees and function-holders can send targeted announcements to their committee or event subscribers.

**Architecture:** Two new EF entities (`Event`, `EventMembership`) extend the existing announcement model with a nullable `TargetEventId` FK. Permission checks (trustee or function-holder) are enforced at the service layer via `CanSendAsync`. The Vite + React frontend gains an Events tab, two new pages, and a refactored compose form.

**Tech Stack:** .NET 10, EF Core 10, SQL Server, xUnit + Moq + InMemory, React 19 JSX, Dexie (IndexedDB), Vite 6

---

## File Map

### Backend — Middleware
| Action | Path |
|---|---|
| CREATE | `src/backend/Marsipan.Membership.Middleware/Entities/Event.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/Entities/EventMembership.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/DTOs/EventDtos.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/Services/IEventService.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/Services/EventService.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementService.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Middleware/Services/SyncService.cs` |

### Backend — Telegram API
| Action | Path |
|---|---|
| CREATE | `src/backend/Marsipan.Membership.Telegram.API/Controllers/EventsController.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Telegram.API/Controllers/AnnouncementsController.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Telegram.API/Program.cs` |

### Tests
| Action | Path |
|---|---|
| CREATE | `src/backend/Marsipan.Membership.Telegram.Tests/Services/EventServiceTests.cs` |
| CREATE | `src/backend/Marsipan.Membership.Telegram.Tests/Services/AnnouncementServiceCanSendTests.cs` |

### Frontend
| Action | Path |
|---|---|
| MODIFY | `src/client/MarcipanoTelegram/src/db/schema.js` |
| MODIFY | `src/client/MarcipanoTelegram/src/sync/syncEngine.js` |
| CREATE | `src/client/MarcipanoTelegram/src/components/TabBar.jsx` |
| CREATE | `src/client/MarcipanoTelegram/src/pages/EventsPage.jsx` |
| CREATE | `src/client/MarcipanoTelegram/src/pages/EventDetailPage.jsx` |
| MODIFY | `src/client/MarcipanoTelegram/src/pages/ComposePage.jsx` |
| MODIFY | `src/client/MarcipanoTelegram/src/App.jsx` |

---

## Task 1: Event and EventMembership entities + migrations

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Entities/Event.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Entities/EventMembership.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs`

- [ ] **Step 1: Create `Event.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/Event.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Events")]
public class Event : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required]
    public int CommitteeId { get; set; }

    [ForeignKey(nameof(CommitteeId))]
    public Committee Committee { get; set; } = null!;

    [Required]
    public int CreatedByMemberId { get; set; }

    [ForeignKey(nameof(CreatedByMemberId))]
    public Member CreatedBy { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public DateTime? StartDate { get; set; }

    public ICollection<EventMembership> Memberships { get; set; } = [];
}
```

- [ ] **Step 2: Create `EventMembership.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Entities/EventMembership.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("EventMemberships")]
public class EventMembership : BaseEntity
{
    [Required]
    public int EventId { get; set; }

    [ForeignKey(nameof(EventId))]
    public Event Event { get; set; } = null!;

    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    public DateTime JoinedAt { get; set; }

    public int? AddedByMemberId { get; set; }

    [ForeignKey(nameof(AddedByMemberId))]
    public Member? AddedBy { get; set; }
}
```

- [ ] **Step 3: Add `TargetEventId` to `Announcement.cs`**

After the existing `TargetFunction` navigation property (line 34), add:

```csharp
    public int? TargetEventId { get; set; }

    [ForeignKey(nameof(TargetEventId))]
    public Event? TargetEvent { get; set; }
```

- [ ] **Step 4: Update `ApplicationContext.cs`**

Add DbSets after `TelegramLinks` (line 31):

```csharp
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventMembership> EventMemberships => Set<EventMembership>();
```

Add to `OnModelCreating`, after the TelegramLink unique indexes (around line 126):

```csharp
        // EventMembership: unique per (event, member)
        modelBuilder.Entity<EventMembership>()
            .HasIndex(em => new { em.EventId, em.MemberId })
            .IsUnique();

        // Prevent cascade cycles for Event → Committee and Event → Member (CreatedBy)
        modelBuilder.Entity<Event>()
            .HasOne(e => e.Committee)
            .WithMany()
            .HasForeignKey(e => e.CommitteeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // EventMembership → Member (no cascade to avoid cycles)
        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.Member)
            .WithMany()
            .HasForeignKey(em => em.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.AddedBy)
            .WithMany()
            .HasForeignKey(em => em.AddedByMemberId)
            .OnDelete(DeleteBehavior.NoAction);

        // EventMembership → Event (cascade delete memberships when event is hard-deleted)
        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.Event)
            .WithMany(e => e.Memberships)
            .HasForeignKey(em => em.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        // Announcement → Event (restrict delete so you can't remove an event with announcements)
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.TargetEvent)
            .WithMany()
            .HasForeignKey(a => a.TargetEventId)
            .OnDelete(DeleteBehavior.Restrict);

        // Soft-delete filter on Event
        modelBuilder.Entity<Event>().HasQueryFilter(e => !e.IsDeleted);
```

- [ ] **Step 5: Add and run migration `AddEvents`**

```
dotnet ef migrations add AddEvents --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Telegram.API
dotnet ef database update --project src/backend/Marsipan.Membership.Middleware --startup-project src/backend/Marsipan.Membership.Telegram.API
```

Expected: migration file created, `Done.` printed.

- [ ] **Step 6: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Entities/Event.cs \
        src/backend/Marsipan.Membership.Middleware/Entities/EventMembership.cs \
        src/backend/Marsipan.Membership.Middleware/Entities/Announcement.cs \
        src/backend/Marsipan.Membership.Middleware/Data/ApplicationContext.cs \
        src/backend/Marsipan.Membership.Middleware/Migrations/
git commit -m "feat: add Event and EventMembership entities with migrations"
```

---

## Task 2: DTOs and service interfaces

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/DTOs/EventDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/AnnouncementDtos.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/IEventService.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementService.cs`

- [ ] **Step 1: Create `EventDtos.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/DTOs/EventDtos.cs
namespace Marsipan.Membership.Middleware.DTOs;

public record EventDto(
    int Id,
    string Name,
    string? Description,
    int CommitteeId,
    int CreatedByMemberId,
    bool IsActive,
    DateTime? StartDate,
    int MemberCount,
    bool IsMember);

public record EventMemberDto(int MemberId, string DisplayName, DateTime JoinedAt, bool SelfSignup);

public record CreateEventRequest(
    string Name,
    string? Description,
    bool IsActive,
    DateTime? StartDate);

public record AddEventMemberRequest(int MemberId);
```

- [ ] **Step 2: Update `AnnouncementDtos.cs`**

Replace the `AnnouncementDto` record to add `TargetEventId`:

```csharp
public record AnnouncementDto(
    int Id,
    string Title,
    string Body,
    int AuthorId,
    string AuthorName,
    CommitteeType? TargetLevel,
    int? TargetCommitteeId,
    int? TargetFunctionId,
    int? TargetEventId,
    DateTime CreatedDate,
    int LikeCount,
    bool LikedByMe,
    IReadOnlyList<AttachmentDto> Attachments);
```

Replace the `CreateAnnouncementRequest` record:

```csharp
public record CreateAnnouncementRequest(
    string Title,
    string Body,
    int? TargetFunctionId,
    int? TargetEventId,
    IReadOnlyList<int> AttachmentIds);
```

Note: `TargetLevel` and `TargetCommitteeId` are removed from the request — they are now always set server-side.

- [ ] **Step 3: Update `SyncDtos.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/DTOs/SyncDtos.cs
namespace Marsipan.Membership.Middleware.DTOs;

public record SyncResponseDto(
    IReadOnlyList<AnnouncementDto> Announcements,
    IReadOnlyList<AnnouncementLikeDto> AnnouncementLikes,
    IReadOnlyList<EventDto> Events,
    IReadOnlyList<int> MyEventIds,
    DateTime ServerTime);
```

- [ ] **Step 4: Create `IEventService.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IEventService.cs
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface IEventService
{
    Task<bool> CanManageAsync(int memberId, CancellationToken ct = default);
    Task<List<EventDto>> GetForMemberAsync(int memberId, CancellationToken ct = default);
    Task<(EventDto Event, List<EventMemberDto> Members)> GetDetailAsync(int eventId, int memberId, CancellationToken ct = default);
    Task<EventDto> CreateAsync(int memberId, CreateEventRequest request, CancellationToken ct = default);
    Task DeleteAsync(int eventId, int memberId, CancellationToken ct = default);
    Task JoinAsync(int eventId, int memberId, CancellationToken ct = default);
    Task LeaveAsync(int eventId, int memberId, CancellationToken ct = default);
    Task AddMemberAsync(int eventId, int organizerMemberId, int targetMemberId, CancellationToken ct = default);
    Task RemoveMemberAsync(int eventId, int organizerMemberId, int targetMemberId, CancellationToken ct = default);
}
```

- [ ] **Step 5: Update `IAnnouncementService.cs`**

Add `CanSendAsync` to the interface:

```csharp
using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface IAnnouncementService
{
    Task<bool> CanSendAsync(int memberId, CancellationToken ct = default);
    Task<AnnouncementDto> CreateAsync(int authorMemberId, CreateAnnouncementRequest request, CancellationToken ct = default);
    Task LikeAsync(int announcementId, int memberId, CancellationToken ct = default);
    Task UnlikeAsync(int announcementId, int memberId, CancellationToken ct = default);
}
```

- [ ] **Step 6: Build to verify no compilation errors**

```
dotnet build src/backend/Marsipan.Membership.Middleware
```

Expected: `Build succeeded.` (AnnouncementService will have compile errors from CreateAsync signature change — fix those in Task 4)

- [ ] **Step 7: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/ \
        src/backend/Marsipan.Membership.Middleware/Services/IEventService.cs \
        src/backend/Marsipan.Membership.Middleware/Services/IAnnouncementService.cs
git commit -m "feat: add Event DTOs and service interfaces"
```

---

## Task 3: EventService implementation + tests

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/EventService.cs`
- Create: `src/backend/Marsipan.Membership.Telegram.Tests/Services/EventServiceTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// src/backend/Marsipan.Membership.Telegram.Tests/Services/EventServiceTests.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class EventServiceTests
{
    private static ApplicationContext BuildDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationContext(opts);
    }

    private static (ApplicationContext db, Member trustee, Member plainMember, Committee committee) SeedBasic()
    {
        var db = BuildDb();
        var committee = new Committee
        {
            Id = 1, Name = "OO Test", Type = Marsipan.Membership.Middleware.Enums.CommitteeType.Municipal,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Committees.Add(committee);

        var trustee = new Member
        {
            Id = 1, FirstName = "Ana", LastName = "Trustee", CommitteeId = 1,
            JMBG = "1111111111111",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        var plain = new Member
        {
            Id = 2, FirstName = "Bob", LastName = "Plain", CommitteeId = 1,
            JMBG = "2222222222222",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Members.AddRange(trustee, plain);
        committee.TrusteeId = 1;
        db.SaveChanges();
        return (db, trustee, plain, committee);
    }

    [Fact]
    public async Task CanManageAsync_Trustee_ReturnsTrue()
    {
        var (db, trustee, _, _) = SeedBasic();
        var sut = new EventService(db);
        Assert.True(await sut.CanManageAsync(trustee.Id));
    }

    [Fact]
    public async Task CanManageAsync_MemberWithFunction_ReturnsTrue()
    {
        var (db, _, plain, _) = SeedBasic();
        db.Functions.Add(new Marsipan.Membership.Middleware.Entities.Function
        {
            Id = 1, Name = "Secretary",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.MemberFunctions.Add(new MemberFunction
        {
            Id = 1, MemberId = plain.Id, FunctionId = 1, CommitteeId = null,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new EventService(db);
        Assert.True(await sut.CanManageAsync(plain.Id));
    }

    [Fact]
    public async Task CanManageAsync_PlainMember_ReturnsFalse()
    {
        var (db, _, plain, _) = SeedBasic();
        var sut = new EventService(db);
        Assert.False(await sut.CanManageAsync(plain.Id));
    }

    [Fact]
    public async Task CreateAsync_Trustee_CreatesEvent()
    {
        var (db, trustee, _, committee) = SeedBasic();
        var sut = new EventService(db);
        var request = new CreateEventRequest("Protest March", "City center", true, null);
        var result = await sut.CreateAsync(trustee.Id, request);
        Assert.Equal("Protest March", result.Name);
        Assert.Equal(committee.Id, result.CommitteeId);
        Assert.Equal(trustee.Id, result.CreatedByMemberId);
    }

    [Fact]
    public async Task JoinAsync_AddsEventMembership()
    {
        var (db, trustee, plain, committee) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        var membership = await db.EventMemberships.FirstOrDefaultAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.NotNull(membership);
        Assert.Null(membership.AddedByMemberId);
    }

    [Fact]
    public async Task JoinAsync_InactiveEvent_ThrowsInvalidOperation()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Closed", null, false, null));
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.JoinAsync(evt.Id, plain.Id));
    }

    [Fact]
    public async Task JoinAsync_Duplicate_IsIdempotent()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        await sut.JoinAsync(evt.Id, plain.Id); // no exception
        var count = await db.EventMemberships.CountAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task LeaveAsync_RemovesMembership()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        await sut.LeaveAsync(evt.Id, plain.Id);
        var membership = await db.EventMemberships.FirstOrDefaultAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Null(membership);
    }

    [Fact]
    public async Task AddMemberAsync_OrganizerAdds_SetsSelfSignupFalse()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.AddMemberAsync(evt.Id, trustee.Id, plain.Id);
        var membership = await db.EventMemberships.FirstAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Equal(trustee.Id, membership.AddedByMemberId);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```
dotnet test src/backend/Marsipan.Membership.Telegram.Tests --filter "EventServiceTests" -v minimal
```

Expected: build error — `EventService` not found.

- [ ] **Step 3: Implement `EventService.cs`**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/EventService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class EventService : IEventService
{
    private readonly ApplicationContext _db;

    public EventService(ApplicationContext db) => _db = db;

    public async Task<bool> CanManageAsync(int memberId, CancellationToken ct = default)
    {
        var member = await _db.Members
            .Include(m => m.Committee)
            .Include(m => m.MemberFunctions)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null) return false;
        if (member.Committee.TrusteeId == memberId) return true;
        return member.MemberFunctions.Any();
    }

    public async Task<List<EventDto>> GetForMemberAsync(int memberId, CancellationToken ct = default)
    {
        var member = await _db.Members.FindAsync([memberId], ct)
            ?? throw new KeyNotFoundException($"Member {memberId} not found.");

        var events = await _db.Events
            .Where(e => e.CommitteeId == member.CommitteeId)
            .Include(e => e.Memberships)
            .ToListAsync(ct);

        return events.Select(e => ToDto(e, memberId)).ToList();
    }

    public async Task<(EventDto Event, List<EventMemberDto> Members)> GetDetailAsync(int eventId, int memberId, CancellationToken ct = default)
    {
        var evt = await _db.Events
            .Include(e => e.Memberships).ThenInclude(em => em.Member)
            .FirstOrDefaultAsync(e => e.Id == eventId, ct)
            ?? throw new KeyNotFoundException($"Event {eventId} not found.");

        var members = evt.Memberships.Select(em => new EventMemberDto(
            em.MemberId,
            $"{em.Member.FirstName} {em.Member.LastName}",
            em.JoinedAt,
            em.AddedByMemberId is null)).ToList();

        return (ToDto(evt, memberId), members);
    }

    public async Task<EventDto> CreateAsync(int memberId, CreateEventRequest request, CancellationToken ct = default)
    {
        var member = await _db.Members.FindAsync([memberId], ct)
            ?? throw new KeyNotFoundException($"Member {memberId} not found.");

        var now = DateTime.UtcNow;
        var evt = new Event
        {
            Name = request.Name,
            Description = request.Description,
            CommitteeId = member.CommitteeId,
            CreatedByMemberId = memberId,
            IsActive = request.IsActive,
            StartDate = request.StartDate,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = memberId.ToString(),
            LastModifiedByUserId = memberId.ToString()
        };
        _db.Events.Add(evt);
        await _db.SaveChangesAsync(ct);

        evt = await _db.Events.Include(e => e.Memberships).FirstAsync(e => e.Id == evt.Id, ct);
        return ToDto(evt, memberId);
    }

    public async Task DeleteAsync(int eventId, int memberId, CancellationToken ct = default)
    {
        var evt = await _db.Events.FindAsync([eventId], ct)
            ?? throw new KeyNotFoundException($"Event {eventId} not found.");
        evt.IsDeleted = true;
        evt.LastModifiedDate = DateTime.UtcNow;
        evt.LastModifiedByUserId = memberId.ToString();
        await _db.SaveChangesAsync(ct);
    }

    public async Task JoinAsync(int eventId, int memberId, CancellationToken ct = default)
    {
        var evt = await _db.Events.FindAsync([eventId], ct)
            ?? throw new KeyNotFoundException($"Event {eventId} not found.");
        if (!evt.IsActive) throw new InvalidOperationException("event_inactive");

        var exists = await _db.EventMemberships
            .AnyAsync(em => em.EventId == eventId && em.MemberId == memberId, ct);
        if (exists) return;

        var now = DateTime.UtcNow;
        _db.EventMemberships.Add(new EventMembership
        {
            EventId = eventId,
            MemberId = memberId,
            JoinedAt = now,
            AddedByMemberId = null,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = memberId.ToString(),
            LastModifiedByUserId = memberId.ToString()
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task LeaveAsync(int eventId, int memberId, CancellationToken ct = default)
    {
        var em = await _db.EventMemberships
            .FirstOrDefaultAsync(em => em.EventId == eventId && em.MemberId == memberId, ct);
        if (em is null) return;
        _db.EventMemberships.Remove(em);
        await _db.SaveChangesAsync(ct);
    }

    public async Task AddMemberAsync(int eventId, int organizerMemberId, int targetMemberId, CancellationToken ct = default)
    {
        var evt = await _db.Events.FindAsync([eventId], ct)
            ?? throw new KeyNotFoundException($"Event {eventId} not found.");

        var exists = await _db.EventMemberships
            .AnyAsync(em => em.EventId == eventId && em.MemberId == targetMemberId, ct);
        if (exists) return;

        var now = DateTime.UtcNow;
        _db.EventMemberships.Add(new EventMembership
        {
            EventId = eventId,
            MemberId = targetMemberId,
            JoinedAt = now,
            AddedByMemberId = organizerMemberId,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = organizerMemberId.ToString(),
            LastModifiedByUserId = organizerMemberId.ToString()
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveMemberAsync(int eventId, int organizerMemberId, int targetMemberId, CancellationToken ct = default)
    {
        var em = await _db.EventMemberships
            .FirstOrDefaultAsync(em => em.EventId == eventId && em.MemberId == targetMemberId, ct)
            ?? throw new KeyNotFoundException($"Member {targetMemberId} is not in event {eventId}.");
        _db.EventMemberships.Remove(em);
        await _db.SaveChangesAsync(ct);
    }

    private static EventDto ToDto(Event e, int callerId) => new(
        e.Id, e.Name, e.Description, e.CommitteeId, e.CreatedByMemberId,
        e.IsActive, e.StartDate,
        e.Memberships.Count,
        e.Memberships.Any(em => em.MemberId == callerId));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
dotnet test src/backend/Marsipan.Membership.Telegram.Tests --filter "EventServiceTests" -v minimal
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/EventService.cs \
        src/backend/Marsipan.Membership.Telegram.Tests/Services/EventServiceTests.cs
git commit -m "feat: implement EventService with tests"
```

---

## Task 4: CanSendAsync + updated AnnouncementService.CreateAsync + tests

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs`
- Create: `src/backend/Marsipan.Membership.Telegram.Tests/Services/AnnouncementServiceCanSendTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// src/backend/Marsipan.Membership.Telegram.Tests/Services/AnnouncementServiceCanSendTests.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class AnnouncementServiceCanSendTests
{
    private static ApplicationContext BuildDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationContext(opts);
    }

    private static (ApplicationContext db, Member trustee, Member plain) Seed()
    {
        var db = BuildDb();
        var committee = new Committee
        {
            Id = 1, Name = "OO", Type = Marsipan.Membership.Middleware.Enums.CommitteeType.Municipal,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Committees.Add(committee);

        var trustee = new Member
        {
            Id = 1, FirstName = "T", LastName = "T", CommitteeId = 1, JMBG = "1111111111111",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        var plain = new Member
        {
            Id = 2, FirstName = "P", LastName = "P", CommitteeId = 1, JMBG = "2222222222222",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Members.AddRange(trustee, plain);
        committee.TrusteeId = 1;
        db.SaveChanges();
        return (db, trustee, plain);
    }

    [Fact]
    public async Task CanSendAsync_Trustee_ReturnsTrue()
    {
        var (db, trustee, _) = Seed();
        var sut = new AnnouncementService(db);
        Assert.True(await sut.CanSendAsync(trustee.Id));
    }

    [Fact]
    public async Task CanSendAsync_FunctionHolder_ReturnsTrue()
    {
        var (db, _, plain) = Seed();
        db.Functions.Add(new Marsipan.Membership.Middleware.Entities.Function
        {
            Id = 1, Name = "Secretary",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.MemberFunctions.Add(new MemberFunction
        {
            Id = 1, MemberId = plain.Id, FunctionId = 1,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new AnnouncementService(db);
        Assert.True(await sut.CanSendAsync(plain.Id));
    }

    [Fact]
    public async Task CanSendAsync_PlainMember_ReturnsFalse()
    {
        var (db, _, plain) = Seed();
        var sut = new AnnouncementService(db);
        Assert.False(await sut.CanSendAsync(plain.Id));
    }

    [Fact]
    public async Task CanSendAsync_UnknownMember_ReturnsFalse()
    {
        var (db, _, _) = Seed();
        var sut = new AnnouncementService(db);
        Assert.False(await sut.CanSendAsync(999));
    }

    [Fact]
    public async Task CreateAsync_ForcesTargetCommitteeId_FromMember()
    {
        var (db, trustee, _) = Seed();
        var sut = new AnnouncementService(db);
        var req = new CreateAnnouncementRequest("Hello", "Body", null, null, []);
        var result = await sut.CreateAsync(trustee.Id, req);
        Assert.Equal(trustee.CommitteeId, result.TargetCommitteeId);
    }

    [Fact]
    public async Task CreateAsync_WithEventTarget_SetsTargetEventId()
    {
        var (db, trustee, _) = Seed();
        var now = DateTime.UtcNow;
        db.Events.Add(new Event
        {
            Id = 1, Name = "Rally", CommitteeId = 1, CreatedByMemberId = trustee.Id, IsActive = true,
            CreatedDate = now, LastModifiedDate = now, CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new AnnouncementService(db);
        var req = new CreateAnnouncementRequest("Protest update", "At 18:00", null, 1, []);
        var result = await sut.CreateAsync(trustee.Id, req);
        Assert.Equal(1, result.TargetEventId);
        Assert.Null(result.TargetCommitteeId);
    }
}
```

- [ ] **Step 2: Run tests to see them fail**

```
dotnet test src/backend/Marsipan.Membership.Telegram.Tests --filter "AnnouncementServiceCanSendTests" -v minimal
```

Expected: compile error — `CanSendAsync` not yet implemented.

- [ ] **Step 3: Update `AnnouncementService.cs`**

Replace the entire file:

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly ApplicationContext _db;
    private readonly IAnnouncementNotifier? _notifier;

    public AnnouncementService(ApplicationContext db, IAnnouncementNotifier? notifier = null)
    {
        _db = db;
        _notifier = notifier;
    }

    public async Task<bool> CanSendAsync(int memberId, CancellationToken ct = default)
    {
        var member = await _db.Members
            .Include(m => m.Committee)
            .Include(m => m.MemberFunctions)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null) return false;
        if (member.Committee.TrusteeId == memberId) return true;
        return member.MemberFunctions.Any();
    }

    public async Task<AnnouncementDto> CreateAsync(int authorMemberId, CreateAnnouncementRequest request, CancellationToken ct = default)
    {
        var author = await _db.Members.FindAsync([authorMemberId], ct)
            ?? throw new KeyNotFoundException($"Member {authorMemberId} not found.");

        // TargetCommitteeId is always forced server-side; null only when targeting an event
        int? targetCommitteeId = request.TargetEventId.HasValue ? null : author.CommitteeId;

        var announcement = new Announcement
        {
            Title = request.Title,
            Body = request.Body,
            AuthorId = authorMemberId,
            TargetCommitteeId = targetCommitteeId,
            TargetFunctionId = request.TargetFunctionId,
            TargetEventId = request.TargetEventId,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = authorMemberId.ToString(),
            LastModifiedByUserId = authorMemberId.ToString()
        };

        if (request.AttachmentIds.Count > 0)
        {
            var attachments = await _db.Attachments
                .Where(a => request.AttachmentIds.Contains(a.Id) && a.AnnouncementId == null)
                .ToListAsync(ct);
            foreach (var att in attachments)
                announcement.Attachments.Add(att);
        }

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(ct);

        if (_notifier is not null)
            await _notifier.NotifyAsync(announcement, ct);

        return new AnnouncementDto(
            announcement.Id, announcement.Title, announcement.Body,
            announcement.AuthorId, $"{author.FirstName} {author.LastName}",
            null, announcement.TargetCommitteeId, announcement.TargetFunctionId, announcement.TargetEventId,
            announcement.CreatedDate, 0, false,
            announcement.Attachments.Select(a => new AttachmentDto(a.Id, a.FileName, a.FileUrl, a.FileSize, a.MimeType)).ToList());
    }

    public async Task LikeAsync(int announcementId, int memberId, CancellationToken ct = default)
    {
        var exists = await _db.AnnouncementLikes.AnyAsync(l => l.AnnouncementId == announcementId && l.MemberId == memberId, ct);
        if (exists) return;
        _db.AnnouncementLikes.Add(new AnnouncementLike
        {
            AnnouncementId = announcementId,
            MemberId = memberId,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = memberId.ToString(),
            LastModifiedByUserId = memberId.ToString()
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task UnlikeAsync(int announcementId, int memberId, CancellationToken ct = default)
    {
        var like = await _db.AnnouncementLikes.FirstOrDefaultAsync(l => l.AnnouncementId == announcementId && l.MemberId == memberId, ct);
        if (like is null) return;
        _db.AnnouncementLikes.Remove(like);
        await _db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 4: Run all tests**

```
dotnet test src/backend/Marsipan.Membership.Telegram.Tests -v minimal
```

Expected: all tests pass (EventServiceTests + AnnouncementServiceCanSendTests + existing tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/AnnouncementService.cs \
        src/backend/Marsipan.Membership.Telegram.Tests/Services/AnnouncementServiceCanSendTests.cs
git commit -m "feat: implement CanSendAsync and update CreateAsync to force server-side targeting"
```

---

## Task 5: EventsController + AnnouncementsController can-send + Program.cs DI

**Files:**
- Create: `src/backend/Marsipan.Membership.Telegram.API/Controllers/EventsController.cs`
- Modify: `src/backend/Marsipan.Membership.Telegram.API/Controllers/AnnouncementsController.cs`
- Modify: `src/backend/Marsipan.Membership.Telegram.API/Program.cs`

- [ ] **Step 1: Create `EventsController.cs`**

```csharp
// src/backend/Marsipan.Membership.Telegram.API/Controllers/EventsController.cs
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/events")]
[Authorize(Policy = "ApiPolicy")]
public class EventsController : ControllerBase
{
    private readonly IEventService _events;
    public EventsController(IEventService events) => _events = events;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpGet]
    public async Task<ActionResult<List<EventDto>>> GetEvents(CancellationToken ct)
    {
        var result = await _events.GetForMemberAsync(MemberId, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEvent(int id, CancellationToken ct)
    {
        var (evt, members) = await _events.GetDetailAsync(id, MemberId, ct);
        return Ok(new { @event = evt, members });
    }

    [HttpPost]
    public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventRequest request, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        var result = await _events.CreateAsync(MemberId, request, ct);
        return CreatedAtAction(nameof(GetEvent), new { id = result.Id }, result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.DeleteAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> Join(int id, CancellationToken ct)
    {
        try { await _events.JoinAsync(id, MemberId, ct); }
        catch (InvalidOperationException ex) when (ex.Message == "event_inactive")
        { return BadRequest(new { reason = "event_inactive" }); }
        return NoContent();
    }

    [HttpDelete("{id:int}/join")]
    public async Task<IActionResult> Leave(int id, CancellationToken ct)
    {
        await _events.LeaveAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddEventMemberRequest request, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.AddMemberAsync(id, MemberId, request.MemberId, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/members/{targetMemberId:int}")]
    public async Task<IActionResult> RemoveMember(int id, int targetMemberId, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.RemoveMemberAsync(id, MemberId, targetMemberId, ct);
        return NoContent();
    }
}
```

- [ ] **Step 2: Add `can-send` endpoint to `AnnouncementsController.cs`**

Add after the `Unlike` action (before the closing `}`):

```csharp
    [HttpGet("can-send")]
    public async Task<IActionResult> CanSend(CancellationToken ct)
    {
        var canSend = await _announcements.CanSendAsync(MemberId, ct);
        return Ok(new { canSend });
    }
```

- [ ] **Step 3: Register `IEventService` in `Program.cs`**

After the existing `AddScoped<IAnnouncementService>` line, add:

```csharp
builder.Services.AddScoped<IEventService, EventService>();
```

- [ ] **Step 4: Build the API project**

```
dotnet build src/backend/Marsipan.Membership.Telegram.API
```

Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
git add src/backend/Marsipan.Membership.Telegram.API/Controllers/EventsController.cs \
        src/backend/Marsipan.Membership.Telegram.API/Controllers/AnnouncementsController.cs \
        src/backend/Marsipan.Membership.Telegram.API/Program.cs
git commit -m "feat: add EventsController, can-send endpoint, and DI registration"
```

---

## Task 6: TelegramBotService event notifications + SyncService events

**Files:**
- Modify: `src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/SyncService.cs`

- [ ] **Step 1: Update `TelegramBotService.NotifyAsync`**

Replace the `linksQuery` block (starting at line 53) with the updated version that handles `TargetEventId`:

```csharp
    public async Task NotifyAsync(Announcement announcement, CancellationToken ct = default)
    {
        if (_botClient is null) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();

        List<TelegramLink> links;

        if (announcement.TargetEventId.HasValue)
        {
            // Event-targeted: notify all members who joined the event
            var memberIds = await db.EventMemberships
                .Where(em => em.EventId == announcement.TargetEventId.Value)
                .Select(em => em.MemberId)
                .ToHashSetAsync(ct);

            links = await db.TelegramLinks
                .Where(t => !t.IsDeleted && memberIds.Contains(t.MemberId))
                .ToListAsync(ct);
        }
        else
        {
            // Committee-targeted: existing logic
            var memberFunctionIds = announcement.TargetFunctionId.HasValue
                ? await db.MemberFunctions
                    .Where(mf => mf.FunctionId == announcement.TargetFunctionId.Value)
                    .Select(mf => mf.MemberId).ToHashSetAsync(ct)
                : null;

            var linksQuery = db.TelegramLinks
                .Include(t => t.Member).ThenInclude(m => m.Committee)
                .Where(t => !t.IsDeleted);

            if (announcement.TargetCommitteeId.HasValue)
                linksQuery = linksQuery.Where(t => t.Member.CommitteeId == announcement.TargetCommitteeId.Value);

            if (announcement.TargetLevel.HasValue)
                linksQuery = linksQuery.Where(t => t.Member.Committee.Type == announcement.TargetLevel.Value);

            links = await linksQuery.ToListAsync(ct);

            if (memberFunctionIds is not null)
                links = links.Where(t => memberFunctionIds.Contains(t.MemberId)).ToList();
        }

        var button = new InlineKeyboardMarkup(
            InlineKeyboardButton.WithWebApp("Read", new global::Telegram.Bot.Types.WebAppInfo { Url = _opts.MiniAppUrl }));

        var batches = links.Chunk(30);
        foreach (var batch in batches)
        {
            var tasks = batch.Select(link =>
                _botClient.SendMessage(
                    chatId: link.TelegramUserId,
                    text: $"📢 *{EscapeMarkdown(announcement.Title)}*",
                    parseMode: global::Telegram.Bot.Types.Enums.ParseMode.MarkdownV2,
                    replyMarkup: button,
                    cancellationToken: ct)
                .ContinueWith(t =>
                {
                    if (t.IsFaulted)
                        _logger.LogWarning("Failed to notify TelegramUserId {Id}: {Err}", link.TelegramUserId, t.Exception?.Message);
                }, CancellationToken.None));

            await Task.WhenAll(tasks);
            await Task.Delay(1100, ct);
        }
    }
```

- [ ] **Step 2: Update `SyncService.GetDeltaAsync`**

Replace the `return new SyncResponseDto(...)` at the end of the method with:

```csharp
        // Events for member's committee
        var eventsQuery = _db.Events
            .Where(e => e.CommitteeId == member.CommitteeId)
            .Include(e => e.Memberships);

        if (since.HasValue)
            eventsQuery = (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<Marsipan.Membership.Middleware.Entities.Event, System.Collections.Generic.ICollection<Marsipan.Membership.Middleware.Entities.EventMembership>>)eventsQuery.Where(e => e.LastModifiedDate > since.Value);

        var events = await eventsQuery.ToListAsync(ct);

        var myEventIds = await _db.EventMemberships
            .Where(em => em.MemberId == memberId)
            .Select(em => em.EventId)
            .ToListAsync(ct);

        var eventDtos = events.Select(e => new EventDto(
            e.Id, e.Name, e.Description, e.CommitteeId, e.CreatedByMemberId,
            e.IsActive, e.StartDate,
            e.Memberships.Count,
            e.Memberships.Any(em => em.MemberId == memberId)
        )).ToList();

        return new SyncResponseDto(announcementDtos, likeDtos, eventDtos, myEventIds, DateTime.UtcNow);
```

Note: also add the event visibility filter for event-targeted announcements to the existing announcements query. Replace the `Where` predicate:

```csharp
        var query = _db.Announcements
            .Include(a => a.Attachments)
            .Include(a => a.Author)
            .Include(a => a.Likes)
            .Where(a =>
                (a.TargetCommitteeId == null || a.TargetCommitteeId == member.CommitteeId) &&
                (a.TargetLevel == null || a.TargetLevel == member.Committee.Type) &&
                (a.TargetFunctionId == null || memberFunctionIds.Contains(a.TargetFunctionId.Value)) &&
                (a.TargetEventId == null || _db.EventMemberships.Any(em => em.EventId == a.TargetEventId && em.MemberId == memberId)));
```

- [ ] **Step 3: Build and run all tests**

```
dotnet build src/backend/Marsipan.Membership.Telegram.API
dotnet test src/backend/Marsipan.Membership.Telegram.Tests -v minimal
```

Expected: build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/backend/Marsipan.Membership.Telegram.API/Services/TelegramBotService.cs \
        src/backend/Marsipan.Membership.Middleware/Services/SyncService.cs
git commit -m "feat: add event notification branch to TelegramBotService and events to SyncService"
```

---

## Task 7: Frontend — DB schema and sync engine

**Files:**
- Modify: `src/client/MarcipanoTelegram/src/db/schema.js`
- Modify: `src/client/MarcipanoTelegram/src/sync/syncEngine.js`

- [ ] **Step 1: Update `schema.js` — add events stores and bump version**

```js
// src/client/MarcipanoTelegram/src/db/schema.js
import Dexie from 'dexie';

export const db = new Dexie('MarcipanoTelegram');

db.version(1).stores({
  announcements: 'id, createdDate, authorId, targetCommitteeId, targetLevel',
  announcementLikes: '[announcementId+memberId], announcementId, memberId',
  outbox: '++id, action, status, createdAt',
  syncMeta: 'key',
});

db.version(2).stores({
  announcements: 'id, createdDate, authorId, targetCommitteeId, targetLevel, targetEventId',
  announcementLikes: '[announcementId+memberId], announcementId, memberId',
  outbox: '++id, action, status, createdAt',
  syncMeta: 'key',
  events: 'id, committeeId, isActive',
  eventMemberships: 'eventId',
});
```

- [ ] **Step 2: Update `syncEngine.js` — sync events and handle event outbox actions**

```js
// src/client/MarcipanoTelegram/src/sync/syncEngine.js
import { api } from '../framework/api.js';
import { auth } from '../framework/auth.js';
import { db } from '../db/schema.js';

let syncing = false;

export async function sync() {
  if (syncing || !auth.isAuthenticated()) return;
  syncing = true;
  try {
    const meta = await db.syncMeta.get('lastSync');
    const since = meta?.value ?? null;

    const data = await api.get(`/api/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`);

    await db.transaction('rw', [db.announcements, db.announcementLikes, db.events, db.eventMemberships, db.syncMeta], async () => {
      for (const ann of data.announcements) {
        await db.announcements.put(ann);
      }
      for (const like of data.announcementLikes) {
        await db.announcementLikes.put(like);
      }
      for (const evt of data.events) {
        await db.events.put(evt);
      }
      // Replace caller's event memberships wholesale
      await db.eventMemberships.clear();
      for (const id of data.myEventIds) {
        await db.eventMemberships.put({ eventId: id });
      }
      await db.syncMeta.put({ key: 'lastSync', value: data.serverTime });
    });

    await flushOutbox();
  } catch (err) {
    console.warn('Sync failed:', err);
  } finally {
    syncing = false;
  }
}

async function flushOutbox() {
  const pending = await db.outbox.where('status').equals('pending').toArray();
  for (const item of pending) {
    try {
      if (item.action === 'LIKE_ANNOUNCEMENT') {
        await api.post(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'UNLIKE_ANNOUNCEMENT') {
        await api.delete(`/api/announcements/${item.payload.id}/like`);
      } else if (item.action === 'CREATE_ANNOUNCEMENT') {
        await api.post('/api/announcements', item.payload);
      } else if (item.action === 'JOIN_EVENT') {
        await api.post(`/api/events/${item.payload.eventId}/join`);
      } else if (item.action === 'LEAVE_EVENT') {
        await api.delete(`/api/events/${item.payload.eventId}/join`);
      } else if (item.action === 'CREATE_EVENT') {
        await api.post('/api/events', item.payload);
      }
      await db.outbox.delete(item.id);
    } catch {
      await db.outbox.update(item.id, { status: 'failed' });
    }
  }
}

export function startSyncLoop(intervalMs = 30_000) {
  sync();
  return setInterval(() => {
    if (navigator.onLine) sync();
  }, intervalMs);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/MarcipanoTelegram/src/db/schema.js \
        src/client/MarcipanoTelegram/src/sync/syncEngine.js
git commit -m "feat: add events and eventMemberships to IndexedDB schema and sync engine"
```

---

## Task 8: TabBar + EventsPage + App routes

**Files:**
- Create: `src/client/MarcipanoTelegram/src/components/TabBar.jsx`
- Create: `src/client/MarcipanoTelegram/src/pages/EventsPage.jsx`
- Modify: `src/client/MarcipanoTelegram/src/App.jsx`

- [ ] **Step 1: Create `TabBar.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/components/TabBar.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Feed' },
  { path: '/events', label: 'Events' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.1)' }}>
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path);
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{ color: active ? 'var(--color-accent)' : 'var(--color-hint)' }}>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Create `EventsPage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/EventsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema.js';
import { api } from '../framework/api.js';
import { sync } from '../sync/syncEngine.js';

export default function EventsPage() {
  const navigate = useNavigate();
  const [canManage, setCanManage] = useState(false);

  const events = useLiveQuery(() => db.events.toArray(), []);
  const myMemberships = useLiveQuery(() => db.eventMemberships.toArray(), []);
  const myEventIds = new Set((myMemberships ?? []).map(m => m.eventId));

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanManage(r.canSend))
      .catch(() => {});
  }, []);

  const cardStyle = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '0.75rem',
    padding: '0.875rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Events</h1>
        {canManage && (
          <button onClick={() => navigate('/events/new')}
            className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            + New
          </button>
        )}
      </div>

      {!events || events.length === 0 ? (
        <p className="text-sm text-center mt-8" style={{ color: 'var(--color-hint)' }}>
          No events yet.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(evt => (
            <button key={evt.id} onClick={() => navigate(`/events/${evt.id}`)}
              className="w-full text-left" style={cardStyle}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{evt.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-hint)' }}>
                  {evt.memberCount} {evt.memberCount === 1 ? 'member' : 'members'}
                  {!evt.isActive && ' · Closed'}
                </p>
              </div>
              {myEventIds.has(evt.id) && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
                  Joined
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `App.jsx`** — add TabBar, Events routes, and bottom padding to main

Import at the top:

```jsx
import TabBar from './components/TabBar.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
```

Replace the return block (the authenticated BrowserRouter section):

```jsx
  return (
    <BrowserRouter>
      <AppHeader />
      <SyncStatusBar />
      <main className="page-content pb-14">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </BrowserRouter>
  );
```

- [ ] **Step 4: Trigger a sync and open the app in browser to verify the Events tab appears**

Open http://localhost:5182, click "Auth (dev)", confirm the tab bar shows Feed | Events.

- [ ] **Step 5: Commit**

```bash
git add src/client/MarcipanoTelegram/src/components/TabBar.jsx \
        src/client/MarcipanoTelegram/src/pages/EventsPage.jsx \
        src/client/MarcipanoTelegram/src/App.jsx
git commit -m "feat: add TabBar, EventsPage, and events routes"
```

---

## Task 9: EventDetailPage

**Files:**
- Create: `src/client/MarcipanoTelegram/src/pages/EventDetailPage.jsx`

- [ ] **Step 1: Create `EventDetailPage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/EventDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema.js';
import { api } from '../framework/api.js';
import { sync } from '../sync/syncEngine.js';

export default function EventDetailPage() {
  const { id } = useParams();
  const eventId = parseInt(id, 10);
  const navigate = useNavigate();

  const event = useLiveQuery(() => db.events.get(eventId), [eventId]);
  const membership = useLiveQuery(() => db.eventMemberships.get(eventId), [eventId]);
  const isMember = !!membership;

  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState([]);
  const [addInput, setAddInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanManage(r.canSend))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canManage) return;
    api.get(`/api/events/${eventId}`)
      .then(r => setMembers(r.members ?? []))
      .catch(() => {});
  }, [eventId, canManage]);

  const toggleMembership = async () => {
    setLoading(true);
    setError('');
    try {
      if (isMember) {
        await api.delete(`/api/events/${eventId}/join`);
      } else {
        await api.post(`/api/events/${eventId}/join`);
      }
      await sync();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const memberId = parseInt(addInput.trim(), 10);
    if (isNaN(memberId)) { setError('Enter a valid member ID.'); return; }
    setError('');
    try {
      await api.post(`/api/events/${eventId}/members`, { memberId });
      const updated = await api.get(`/api/events/${eventId}`);
      setMembers(updated.members ?? []);
      setAddInput('');
    } catch (e) {
      setError(e.message);
    }
  };

  const removeMember = async (memberId) => {
    try {
      await api.delete(`/api/events/${eventId}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.memberId !== memberId));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!event) return (
    <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--color-hint)' }}>
      Loading…
    </div>
  );

  const inputStyle = {
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem', fontSize: '0.875rem', flex: 1,
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{event.name}</h1>
        {event.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-hint)' }}>{event.description}</p>
        )}
        {event.startDate && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-hint)' }}>
            {new Date(event.startDate).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-hint)' }}>
          {event.memberCount} {event.memberCount === 1 ? 'member' : 'members'}
          {!event.isActive && ' · Closed'}
        </p>
      </div>

      {event.isActive && (
        <button onClick={toggleMembership} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: isMember ? 'var(--color-surface)' : 'var(--color-accent)',
            color: isMember ? 'var(--color-text)' : 'var(--color-accent-text)',
            border: isMember ? '1px solid rgba(255,255,255,0.15)' : 'none',
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? '…' : isMember ? 'Leave' : 'Join'}
        </button>
      )}

      {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}

      {canManage && (
        <div className="pt-2 space-y-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-hint)' }}>MEMBERS</p>
          {members.map(m => (
            <div key={m.memberId} className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>{m.displayName}</p>
                <p className="text-xs" style={{ color: 'var(--color-hint)' }}>
                  {m.selfSignup ? 'Self-signed up' : 'Added by organizer'}
                </p>
              </div>
              <button onClick={() => removeMember(m.memberId)}
                className="text-xs px-2 py-1 rounded"
                style={{ color: '#ef5350' }}>
                Remove
              </button>
            </div>
          ))}
          <form onSubmit={addMember} className="flex gap-2 pt-1">
            <input style={inputStyle} value={addInput} onChange={e => setAddInput(e.target.value)}
              placeholder="Member ID" type="number" />
            <button type="submit"
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify navigation in browser**

Open http://localhost:5182, auth (dev), go to Events tab. Events list should show. Tapping an event should open the detail page and the back button (Telegram or browser back) should return to the list.

- [ ] **Step 3: Commit**

```bash
git add src/client/MarcipanoTelegram/src/pages/EventDetailPage.jsx
git commit -m "feat: add EventDetailPage with join/leave and organizer member management"
```

---

## Task 10: ComposePage refactor

**Files:**
- Modify: `src/client/MarcipanoTelegram/src/pages/ComposePage.jsx`

- [ ] **Step 1: Replace `ComposePage.jsx`**

```jsx
// src/client/MarcipanoTelegram/src/pages/ComposePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../framework/api.js';
import { db } from '../db/schema.js';
import { sync } from '../sync/syncEngine.js';

export default function ComposePage() {
  const navigate = useNavigate();
  const [canSend, setCanSend] = useState(null); // null = loading
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('committee'); // 'committee' | 'event'
  const [targetFunctionId, setTargetFunctionId] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [attachmentIds, setAttachmentIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const events = useLiveQuery(() => db.events.where('isActive').equals(1).toArray(), []);

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanSend(r.canSend))
      .catch(() => setCanSend(false));
  }, []);

  // Redirect non-senders away
  useEffect(() => {
    if (canSend === false) navigate('/');
  }, [canSend, navigate]);

  if (canSend === null) return null; // loading

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await api.upload('/api/attachments/upload', file);
      setAttachmentIds(prev => [...prev, result.id]);
    } catch {
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await db.outbox.add({
        action: 'CREATE_ANNOUNCEMENT',
        payload: {
          title: title.trim(),
          body: body.trim(),
          targetFunctionId: targetType === 'committee' && targetFunctionId ? parseInt(targetFunctionId, 10) : null,
          targetEventId: targetType === 'event' && targetEventId ? parseInt(targetEventId, 10) : null,
          attachmentIds,
        },
        status: 'pending',
        createdAt: Date.now(),
      });
      await sync();
      navigate('/');
    } catch {
      setError('Failed to submit announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
    padding: '0.6rem 0.75rem', width: '100%', fontSize: '0.875rem',
  };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--color-hint)', marginBottom: '0.25rem', display: 'block' };

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
        </div>

        <div>
          <label style={labelStyle}>Body *</label>
          <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" />
        </div>

        <div>
          <label style={labelStyle}>Target</label>
          <select style={inputStyle} value={targetType} onChange={e => setTargetType(e.target.value)}>
            <option value="committee">My Committee</option>
            <option value="event">Event</option>
          </select>
        </div>

        {targetType === 'committee' && (
          <div>
            <label style={labelStyle}>Filter by Function (optional)</label>
            <input style={inputStyle} type="number" value={targetFunctionId}
              onChange={e => setTargetFunctionId(e.target.value)}
              placeholder="Leave blank for all members" />
          </div>
        )}

        {targetType === 'event' && (
          <div>
            <label style={labelStyle}>Event *</label>
            <select style={inputStyle} value={targetEventId} onChange={e => setTargetEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {(events ?? []).map(evt => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} disabled={uploading}
            style={{ ...inputStyle, cursor: 'pointer' }} />
          {attachmentIds.length > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
              {attachmentIds.length} file{attachmentIds.length !== 1 ? 's' : ''} attached
            </p>
          )}
        </div>

        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}

        <button type="submit" disabled={submitting || uploading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
          {submitting ? 'Sending…' : 'Publish Announcement'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Update `AppHeader.jsx` — hide `+ New` button for non-senders**

In `AppHeader.jsx`, the `+ New` button is rendered unconditionally. Wrap it in a `canSend` check. Replace the existing button logic:

In `AppHeader.jsx`, add state + effect after existing imports:

```jsx
import React, { useEffect, useState } from 'react'; // already imported
// Add inside AppHeader component, after existing state:
const [canSend, setCanSend] = useState(false);
useEffect(() => {
  import('../framework/api.js').then(({ api }) =>
    api.get('/api/announcements/can-send')
      .then(r => setCanSend(r.canSend))
      .catch(() => {}));
}, []);
```

Then replace the `+ New` button condition:

```jsx
        {!isDetail && !isCompose && canSend && (
          <button onClick={() => navigate('/compose')} className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            + New
          </button>
        )}
```

- [ ] **Step 3: Build frontend and verify in browser**

In a browser at http://localhost:5182:
1. Auth (dev) → confirm `+ New` button is hidden (dev user has no committee/functions in the DB)
2. Open Events tab → confirm list renders (empty)
3. Compose route redirect — navigate to `/compose` manually — should redirect to `/` since dev user can't send

- [ ] **Step 4: Run all backend tests one final time**

```
dotnet test src/backend/Marsipan.Membership.Telegram.Tests -v minimal
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/client/MarcipanoTelegram/src/pages/ComposePage.jsx \
        src/client/MarcipanoTelegram/src/components/AppHeader.jsx
git commit -m "feat: refactor ComposePage with event targeting and can-send gate"
```

---

## Self-Review

**Spec coverage:**
- Committee broadcasts (trustee/function-holder) → CanSendAsync in Tasks 4 + 5 ✓
- Event groups (create, join, leave, organizer-add/remove) → EventService + controller in Tasks 3–5 ✓
- TargetEventId on announcements → Tasks 1, 4 ✓
- Bot notification to event subscribers → Task 6 ✓
- Sync includes events + myEventIds → Task 6 ✓
- ComposePage can-send gate + event picker → Task 10 ✓
- AppHeader hides + New for non-senders → Task 10 ✓
- EventsPage + EventDetailPage → Tasks 8–9 ✓
- TabBar → Task 8 ✓
- Two EF migrations → Task 1 ✓
- 403 on unauthorized create/manage → Tasks 5, 10 ✓
- 400 on inactive event join → Task 5 ✓
- Duplicate RSVP idempotent → Task 3 test + EventService.JoinAsync ✓

**Type consistency:**
- `EventDto` defined in Task 2, used in Tasks 3, 5, 6, 8, 9 — consistent ✓
- `CreateAnnouncementRequest` updated in Task 2, used in Tasks 4, 10 — `TargetFunctionId`, `TargetEventId`, `AttachmentIds` match throughout ✓
- `SyncResponseDto` updated in Task 2, used in Tasks 6, 7 — `Events`, `MyEventIds` consistent ✓
- `IEventService` defined in Task 2, implemented Task 3, injected Task 5 — method signatures consistent ✓
