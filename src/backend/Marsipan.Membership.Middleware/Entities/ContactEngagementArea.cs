using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("ContactEngagementAreas")]
public class ContactEngagementArea : BaseEntity
{
    [Required]
    public int CallContactId { get; set; }

    [ForeignKey(nameof(CallContactId))]
    public CallContact CallContact { get; set; } = null!;

    [Required]
    public EngagementArea Area { get; set; }
}
