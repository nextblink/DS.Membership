namespace Marsipan.Membership.Middleware.DTOs;

public record SyncResponseDto(
    IReadOnlyList<AnnouncementDto> Announcements,
    IReadOnlyList<AnnouncementLikeDto> AnnouncementLikes,
    IReadOnlyList<EventDto> Events,
    IReadOnlyList<int> MyEventIds,
    DateTime ServerTime);
