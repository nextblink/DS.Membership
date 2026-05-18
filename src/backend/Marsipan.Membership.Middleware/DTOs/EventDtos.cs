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
