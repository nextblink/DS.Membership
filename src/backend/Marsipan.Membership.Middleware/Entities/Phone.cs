using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Phones")]
public class Phone : BaseEntity
{
    [Required, MaxLength(30)]
    public string Number { get; set; } = null!;

    [Required]
    public PhoneType Type { get; set; }

    [Required]
    public int MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member Member { get; set; } = null!;
}
