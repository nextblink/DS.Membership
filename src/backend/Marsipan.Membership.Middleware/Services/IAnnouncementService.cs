using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface IAnnouncementService
{
    Task<bool> CanSendAsync(int memberId, CancellationToken ct = default);
    Task<AnnouncementDto> CreateAsync(int authorMemberId, CreateAnnouncementRequest request, CancellationToken ct = default);
    Task LikeAsync(int announcementId, int memberId, CancellationToken ct = default);
    Task UnlikeAsync(int announcementId, int memberId, CancellationToken ct = default);
}
