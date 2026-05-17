using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// EF Core-backed dashboard aggregator. Honours role-based scope via
/// <see cref="ICurrentUserContext"/>: SuperAdmin/Admin see every OrgUnit;
/// LocalAdmin is restricted to a single row matching the caller's own
/// <c>CommitteeId</c>. Viewer/Operator are filtered out at the controller
/// layer and never reach this service.
/// </summary>
/// <remarks>
/// Member counts rely on the soft-delete query filter configured on the
/// <see cref="ApplicationContext"/> (<c>HasQueryFilter(e =&gt; !e.IsDeleted)</c>),
/// so deleted members are not counted.
/// </remarks>
public class DashboardService : IDashboardService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public DashboardService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<DashboardStatsDto> GetStatsAsync(CancellationToken ct = default)
    {
        // Scope: LocalAdmin (or any non-unrestricted role that reaches here)
        // is constrained to their own Committee. SuperAdmin/Admin see all units.
        var isUnrestricted =
            string.Equals(_user.Role, ScopeFilters.RoleSuperAdmin, StringComparison.Ordinal) ||
            string.Equals(_user.Role, ScopeFilters.RoleAdmin, StringComparison.Ordinal);

        var committeesQuery = _db.Committees.AsNoTracking()
            .Where(o => o.Type == CommitteeType.City || o.Type == CommitteeType.Municipal);
        var membersQuery = _db.Members.AsNoTracking();
        var formsQuery = _db.Forms.AsNoTracking();

        if (!isUnrestricted)
        {
            // Authenticated LocalAdmin without CommitteeId fails closed: no rows.
            if (_user.CommitteeId is null)
            {
                return new DashboardStatsDto();
            }

            var scopedCommitteeId = _user.CommitteeId.Value;
            committeesQuery = committeesQuery.Where(o => o.Id == scopedCommitteeId);
            membersQuery = membersQuery.Where(m => m.CommitteeId == scopedCommitteeId);
            formsQuery = formsQuery.Where(f => f.Member!.CommitteeId == scopedCommitteeId);
        }

        // Members count (soft-delete filtered automatically by query filter).
        var totalMembers = await membersQuery.CountAsync(ct);
        var femaleCount = await membersQuery.CountAsync(m => m.Gender == Gender.Female, ct);
        var maleCount = await membersQuery.CountAsync(m => m.Gender == Gender.Male, ct);

        // Members-per-Committee. Use a left-join shape so units with zero members
        // still appear, then map to DTO with the percentage rule.
        var committeesList = await committeesQuery
            .OrderBy(o => o.Name)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.VoterCount,
                MemberCount = _db.Members.Count(m => m.CommitteeId == o.Id)
            })
            .ToListAsync(ct);

        var membersByOrgUnit = committeesList
            .Select(o => new CommitteeMembershipDto
            {
                CommitteeId = o.Id,
                Name = o.Name,
                MemberCount = o.MemberCount,
                VoterCount = o.VoterCount,
                Percentage = o.VoterCount == 0
                    ? 0m
                    : Math.Round((decimal)o.MemberCount / o.VoterCount * 100m, 2),
            })
            .ToList();

        // Forms grouped by status. Use IQueryable GroupBy + ToDictionary as required.
        var rawCounts = await formsQuery
            .GroupBy(f => f.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, ct);

        var formsByStatus = new FormStatusCountsDto
        {
            Pending = rawCounts.TryGetValue(FormStatus.Pending, out var p) ? p : 0,
            Verified = rawCounts.TryGetValue(FormStatus.Verified, out var v) ? v : 0,
            Rejected = rawCounts.TryGetValue(FormStatus.Rejected, out var r) ? r : 0,
        };

        // Committee trust statistics.
        var totalOrgUnits = await committeesQuery.CountAsync(ct);
        var nonTrustworthyCount = await committeesQuery.CountAsync(o => !o.IsTrustful, ct);
        var nonTrustworthyPercentage = totalOrgUnits > 0
            ? Math.Round((decimal)nonTrustworthyCount / totalOrgUnits * 100m, 2)
            : 0m;

        return new DashboardStatsDto
        {
            TotalMembers = totalMembers,
            FemaleCount = femaleCount,
            MaleCount = maleCount,
            MembersByCommittee = membersByOrgUnit,
            FormsByStatus = formsByStatus,
            TotalCommittees = totalOrgUnits,
            NonTrustworthyCommittees = nonTrustworthyCount,
            NonTrustworthyPercentage = nonTrustworthyPercentage,
        };
    }
}
