using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallCenterReportService : ICallCenterReportService
{
    private readonly ApplicationContext _db;

    public CallCenterReportService(ApplicationContext db) => _db = db;

    public async Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default)
    {
        var q = _db.CallContacts.AsQueryable();
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (query.FromDate is not null) q = q.Where(c => c.LastCalledAt >= query.FromDate);
        if (query.ToDate is not null) q = q.Where(c => c.LastCalledAt <= query.ToDate);

        var contacted = await q.CountAsync(c => c.LastOutcome == CallOutcome.ValidContact, ct);
        var invalid = await q.CountAsync(c =>
            c.LastOutcome == CallOutcome.WrongNumber || c.LastOutcome == CallOutcome.NotInService, ct);
        var active = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.ActiveMember, ct);
        var inactive = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.InactiveMember, ct);
        var symp = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.Sympathizer, ct);
        var noCoop = await q.CountAsync(c => c.FinalStatus == ContactFinalStatus.NoCooperation, ct);
        var interested = await q.CountAsync(c => c.WantsToBeActive == true, ct);

        var areaCounts = await _db.ContactEngagementAreas
            .Where(e => q.Any(c => c.Id == e.CallContactId))
            .GroupBy(e => e.Area)
            .Select(g => new EngagementAreaCountDto(g.Key.ToString(), g.Count()))
            .ToListAsync(ct);

        // Materialize the grouped counts first, then order/take in memory: EF Core cannot
        // translate OrderBy/Take chained directly after a GroupBy->Select into a constructed
        // record type (positional record member access on the aggregate isn't recognized by
        // the SQL translator on either SqlServer or InMemory providers).
        var suggestionCounts = await q
            .Where(c => c.SuggestionNote != null && c.SuggestionNote != "")
            .GroupBy(c => c.SuggestionNote!)
            .Select(g => new SuggestionCountDto(g.Key, g.Count()))
            .ToListAsync(ct);

        var suggestions = suggestionCounts
            .OrderByDescending(s => s.Count)
            .Take(20)
            .ToList();

        return new CallCenterReportDto(
            contacted, invalid, active, inactive, symp, noCoop, interested,
            areaCounts, suggestions);
    }
}
