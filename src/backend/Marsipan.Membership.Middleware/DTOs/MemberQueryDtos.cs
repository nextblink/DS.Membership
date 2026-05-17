using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Query / filter parameters accepted by <c>GET /api/members</c>.
/// Filters are AND-combined; unset filters are ignored.
/// </summary>
public class MemberQuery
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? JMBG { get; set; }
    public int? CommitteeId { get; set; }
    public int? FunctionId { get; set; }
    public EducationLevel? EducationLevel { get; set; }
    public Gender? Gender { get; set; }
    public string? Occupation { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
