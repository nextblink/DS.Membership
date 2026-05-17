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
    /// The committee this function is held in. Null = implied from Member.CommitteeId (primary local unit).
    /// Set explicitly for secondary city GRO membership and national body memberships.
    /// </summary>
    public int? CommitteeId { get; set; }

    [ForeignKey(nameof(CommitteeId))]
    public Committee? Committee { get; set; }
}
