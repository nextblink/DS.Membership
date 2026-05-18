using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Events")]
public class Event : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(2000)]
    public string? Description { get; set; }

    [Required]
    public int CommitteeId { get; set; }

    [ForeignKey(nameof(CommitteeId))]
    public Committee Committee { get; set; } = null!;

    [Required]
    public int CreatedByMemberId { get; set; }

    [ForeignKey(nameof(CreatedByMemberId))]
    public Member CreatedBy { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public DateTime? StartDate { get; set; }

    public ICollection<EventMembership> Memberships { get; set; } = [];
}
