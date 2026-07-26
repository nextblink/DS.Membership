using System.Text;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallCenterReportService : ICallCenterReportService
{
    // Upper bound on suggestion rows returned in one report payload; the total is reported
    // separately so the UI can show how many were left out.
    private const int SuggestionsCap = 500;

    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallCenterReportService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    // Scope + filters, shared by the report itself and its CSV export so the file can never
    // describe a different population than the screen it was launched from.
    private IQueryable<Entities.CallContact> BuildScopedQuery(CallCenterReportQuery query)
    {
        var q = _db.CallContacts.ApplyCallContactScope(_user);
        if (query.CampaignId is not null) q = q.Where(c => c.CampaignId == query.CampaignId);
        if (query.PoolId is not null) q = q.Where(c => c.PoolId == query.PoolId);
        if (query.FromDate is not null) q = q.Where(c => c.LastCalledAt >= query.FromDate);
        if (query.ToDate is not null) q = q.Where(c => c.LastCalledAt < query.ToDate.Value.AddDays(1));
        return q;
    }

    public async Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default)
    {
        var q = BuildScopedQuery(query);

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
            .Select(g => new EngagementAreaCountDto(g.Key, g.Count()))
            .ToListAsync(ct);

        // Suggestions are listed, not tallied — see SuggestionItemDto.
        var withSuggestions = q.Where(c => c.SuggestionNote != null && c.SuggestionNote != "");
        var suggestionsTotal = await withSuggestions.CountAsync(ct);
        var suggestions = await withSuggestions
            .OrderByDescending(c => c.LastCalledAt)
            .ThenByDescending(c => c.Id)
            .Take(SuggestionsCap)
            .Select(c => new SuggestionItemDto(
                c.Id,
                c.FirstName + " " + c.LastName,
                c.Municipality != null ? c.Municipality.Name : c.City,
                c.LastCalledAt,
                c.SuggestionNote!))
            .ToListAsync(ct);

        return new CallCenterReportDto(
            contacted, invalid, active, inactive, symp, noCoop, interested,
            areaCounts, suggestions, suggestionsTotal);
    }

    public async Task<string> ExportCsvAsync(CallCenterReportQuery query, CancellationToken ct = default)
    {
        var report = await GetReportAsync(query, ct);
        var sb = new StringBuilder();

        CallCenterCsv.AppendRow(sb, "Метрика", "Вредност");
        CallCenterCsv.AppendRow(sb, "Контактирано", report.Contacted.ToString());
        CallCenterCsv.AppendRow(sb, "Неисправни контакти", report.InvalidContacts.ToString());
        CallCenterCsv.AppendRow(sb, "Активни чланови", report.ActiveMembers.ToString());
        CallCenterCsv.AppendRow(sb, "Неактивни чланови", report.InactiveMembers.ToString());
        CallCenterCsv.AppendRow(sb, "Симпатизери", report.Sympathizers.ToString());
        CallCenterCsv.AppendRow(sb, "Без сарадње", report.NoCooperation.ToString());
        CallCenterCsv.AppendRow(sb, "Заинтересовани за активирање", report.InterestedInActivating.ToString());

        sb.AppendLine();
        CallCenterCsv.AppendRow(sb, "Област ангажовања", "Број");
        foreach (var a in report.EngagementAreaCounts)
        {
            CallCenterCsv.AppendRow(sb, CallCenterCsv.AreaLabels[a.Area], a.Count.ToString());
        }

        // Free text, so it gets its own four-column block rather than the metric/value shape.
        // Exports the full set, not the capped list the UI renders.
        var suggestions = await GetAllSuggestionsAsync(query, ct);
        sb.AppendLine();
        CallCenterCsv.AppendRow(sb, "Датум", "Особа", "Општина", "Сугестија");
        foreach (var s in suggestions)
        {
            CallCenterCsv.AppendRow(sb,
                s.CalledAt?.ToString("yyyy-MM-dd HH:mm"),
                s.ContactName,
                s.MunicipalityName,
                s.Suggestion);
        }

        return sb.ToString();
    }

    private async Task<List<SuggestionItemDto>> GetAllSuggestionsAsync(CallCenterReportQuery query, CancellationToken ct)
        => await BuildScopedQuery(query)
            .Where(c => c.SuggestionNote != null && c.SuggestionNote != "")
            .OrderByDescending(c => c.LastCalledAt)
            .ThenByDescending(c => c.Id)
            .Select(c => new SuggestionItemDto(
                c.Id,
                c.FirstName + " " + c.LastName,
                c.Municipality != null ? c.Municipality.Name : c.City,
                c.LastCalledAt,
                c.SuggestionNote!))
            .ToListAsync(ct);
}
