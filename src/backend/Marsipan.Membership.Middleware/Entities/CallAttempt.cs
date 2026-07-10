using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("CallAttempts")]
public class CallAttempt : BaseEntity
{
    [Required]
    public int CallContactId { get; set; }

    [ForeignKey(nameof(CallContactId))]
    public CallContact CallContact { get; set; } = null!;

    [Required]
    public CallOutcome Outcome { get; set; }

    [Required, MaxLength(450)]
    public string CalledByUserId { get; set; } = null!;

    public DateTime CalledAt { get; set; }

    [MaxLength(1000)]
    public string? Note { get; set; }
}
