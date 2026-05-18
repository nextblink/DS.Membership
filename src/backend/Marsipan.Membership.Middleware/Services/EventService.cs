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
