using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("FcmSubscriptions")]
public class FcmSubscription : BaseEntity
{
    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    [Required, MaxLength(500)]
    public string FcmToken { get; set; } = null!;
}
