using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ISyncService
{
    Task<SyncResponseDto> GetDeltaAsync(int memberId, DateTime? since, CancellationToken ct = default);
}
