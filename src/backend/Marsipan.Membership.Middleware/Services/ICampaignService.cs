using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICampaignService
{
    Task<PagedResultDto<CampaignDto>> SearchAsync(int page, int pageSize, CancellationToken ct = default);
    Task<CampaignDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct = default);
    Task UpdateAsync(int id, UpdateCampaignRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
