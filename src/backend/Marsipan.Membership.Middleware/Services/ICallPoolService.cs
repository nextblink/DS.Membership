using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallPoolService
{
    Task<List<CallPoolDto>> ListAsync(int? campaignId, CancellationToken ct = default);
    Task<CallPoolDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CallPoolDto> CreateAsync(CreateCallPoolRequest request, CancellationToken ct = default);
    Task UpdateAsync(int id, UpdateCallPoolRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<RefreshResultDto> RefreshAsync(int id, CancellationToken ct = default);
    Task<BulkCreateByMunicipalityResultDto> BulkCreateByMunicipalityAsync(int campaignId, CancellationToken ct = default);
    Task SetOperatorsAsync(int id, List<string> userIds, CancellationToken ct = default);
    Task RemoveOperatorAsync(int id, string userId, CancellationToken ct = default);
}
