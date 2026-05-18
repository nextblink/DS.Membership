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
