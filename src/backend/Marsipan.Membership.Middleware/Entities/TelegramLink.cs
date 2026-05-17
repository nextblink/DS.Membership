using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("TelegramLinks")]
public class TelegramLink : BaseEntity
{
    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;

    public long TelegramUserId { get; set; }

    [MaxLength(200)]
    public string? TelegramUsername { get; set; }

    public DateTime LinkedAt { get; set; }
}
