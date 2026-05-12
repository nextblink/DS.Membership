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
}
