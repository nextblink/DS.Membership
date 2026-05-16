namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Aggregate stats payload returned by <c>GET /api/dashboard/stats</c>.
/// </summary>
/// <remarks>
/// Scope rules (enforced in <c>DashboardService</c>):
/// <list type="bullet">
///   <item>SuperAdmin / Admin — totals and rows cover every OrgUnit.</item>
///   <item>LocalAdmin — totals and the single row cover only the caller's own OrgUnit.</item>
///   <item>Viewer / Operator — excluded at the controller layer (role-based <c>[Authorize]</c>); the service is not expected to be invoked for them.</item>
/// </list>
/// Member counts honour the soft-delete query filter (<c>IsDeleted == false</c>).
/// </remarks>
public class DashboardStatsDto
{
    public int TotalMembers { get; set; }
    public int FemaleCount { get; set; }
    public int MaleCount { get; set; }
    public List<OrgUnitMembershipDto> MembersByOrgUnit { get; set; } = new();
    public FormStatusCountsDto FormsByStatus { get; set; } = new();
}

/// <summary>
/// Per-OrgUnit row of the membership breakdown table on the dashboard.
/// </summary>
/// <remarks>
/// <c>Percentage</c> is <c>MemberCount / VoterCount * 100</c>, and is set to
/// <c>0</c> when <c>VoterCount == 0</c> to avoid divide-by-zero on freshly
/// seeded units.
/// </remarks>
public class OrgUnitMembershipDto
{
    public int OrgUnitId { get; set; }
    public string Name { get; set; } = null!;
    public int MemberCount { get; set; }
    public int VoterCount { get; set; }
    public decimal Percentage { get; set; }
}

/// <summary>
/// Counts of <c>Form</c> rows grouped by <c>FormStatus</c>. Forms are not
/// scoped beyond the soft-delete filter because the dashboard is only visible
/// to roles with global form visibility (SuperAdmin/Admin) or to LocalAdmin
/// who sees forms whose linked member belongs to their unit.
/// </summary>
public class FormStatusCountsDto
{
    public int Pending { get; set; }
    public int Verified { get; set; }
    public int Rejected { get; set; }
}
