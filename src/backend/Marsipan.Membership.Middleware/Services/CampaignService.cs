using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CampaignService : ICampaignService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CampaignService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<PagedResultDto<CampaignDto>> SearchAsync(int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var q = _db.Campaigns.OrderByDescending(c => c.Id);
        var total = await q.CountAsync(ct);
        var items = await q
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.Description, c.StartDate, c.IsActive,
                c.Contacts.Count))
            .ToListAsync(ct);

        return new PagedResultDto<CampaignDto>
        {
            Items = items,
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    public async Task<CampaignDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.Campaigns
            .Where(c => c.Id == id)
            .Select(c => new CampaignDto(
                c.Id, c.Name, c.Description, c.StartDate, c.IsActive, c.Contacts.Count))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<CampaignDto> CreateAsync(CreateCampaignRequest request, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var campaign = new Campaign
        {
            Name = request.Name,
            Description = request.Description,
            StartDate = request.StartDate,
            IsActive = request.IsActive,
            CreatedDate = now,
            LastModifiedDate = now,
            CreatedByUserId = uid,
            LastModifiedByUserId = uid
        };
        _db.Campaigns.Add(campaign);
        await _db.SaveChangesAsync(ct);
        return new CampaignDto(campaign.Id, campaign.Name, campaign.Description,
            campaign.StartDate, campaign.IsActive, 0);
    }

    public async Task UpdateAsync(int id, UpdateCampaignRequest request, CancellationToken ct = default)
    {
        var campaign = await _db.Campaigns.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Campaign {id} not found.");
        campaign.Name = request.Name;
        campaign.Description = request.Description;
        campaign.StartDate = request.StartDate;
        campaign.IsActive = request.IsActive;
        campaign.LastModifiedDate = DateTime.UtcNow;
        campaign.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var campaign = await _db.Campaigns.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Campaign {id} not found.");
        campaign.IsDeleted = true;
        campaign.LastModifiedDate = DateTime.UtcNow;
        campaign.LastModifiedByUserId = _user.Id ?? "system";
        await _db.SaveChangesAsync(ct);
    }
}
