using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallPoolOperators")]
public class CallPoolOperator : BaseEntity
{
    [Required]
    public int CallPoolId { get; set; }

    [ForeignKey(nameof(CallPoolId))]
    public CallPool CallPool { get; set; } = null!;

    [Required, MaxLength(450)]
    public string UserId { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public ApplicationUser User { get; set; } = null!;
}
