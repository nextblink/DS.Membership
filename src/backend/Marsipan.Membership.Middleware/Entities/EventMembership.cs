using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("EventMemberships")]
public class EventMembership : BaseEntity
{
    [Required]
    public int EventId { get; set; }

    [ForeignKey(nameof(EventId))]
    public Event Event { get; set; } = null!;

    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    public DateTime JoinedAt { get; set; }

    public int? AddedByMemberId { get; set; }

    [ForeignKey(nameof(AddedByMemberId))]
    public Member? AddedBy { get; set; }
}
