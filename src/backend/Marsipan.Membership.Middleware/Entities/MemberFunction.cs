using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("MemberFunctions")]
public class MemberFunction : BaseEntity
{
    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    [Required]
    public int FunctionId { get; set; }

    [ForeignKey(nameof(FunctionId))]
    public Function Function { get; set; } = null!;

    [Required]
    public DateOnly AssignedDate { get; set; }

    /// <summary>
    /// The org unit this function is held in. Null = implied from Member.OrgUnitId (primary local unit).
    /// Set explicitly for secondary city GRO membership and national body memberships.
    /// </summary>
    public int? OrgUnitId { get; set; }

    [ForeignKey(nameof(OrgUnitId))]
    public OrgUnit? OrgUnit { get; set; }
}
