namespace Marsipan.Membership.Middleware.DTOs;

public record SyncResponseDto(
    IReadOnlyList<AnnouncementDto> Announcements,
    IReadOnlyList<AnnouncementLikeDto> AnnouncementLikes,
    DateTime ServerTime);
