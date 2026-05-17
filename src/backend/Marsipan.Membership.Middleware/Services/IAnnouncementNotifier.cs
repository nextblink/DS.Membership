using Marsipan.Membership.Middleware.Entities;

namespace Marsipan.Membership.Middleware.Services;

public interface IAnnouncementNotifier
{
    Task NotifyAsync(Announcement announcement, CancellationToken ct = default);
}
