using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Forms")]
public class Form : BaseEntity
{
    [MaxLength(50)]
    public string? FormNumber { get; set; }

    public DateOnly? FormDate { get; set; }

    [MaxLength(200)]
    public string? MunicipalBoard { get; set; }

    public int? MemberId { get; set; }

    [ForeignKey(nameof(MemberId))]
    public Member? Member { get; set; }

    [Required]
    public DateOnly ScanDate { get; set; }

    [Required]
    public FormStatus Status { get; set; } = FormStatus.Pending;

    // Spec requires CreatedByUserId on Form to be [Required, MaxLength(450)] and bound to
    // an ApplicationUser navigation. BaseEntity already exposes a nullable CreatedByUserId
    // audit column; redeclaring it here with `new` lets EF map a single non-nullable FK
    // column with a navigation to ApplicationUser (per task brief), without disturbing the
    // optional audit column on other aggregates.
    [Required, MaxLength(450)]
    public new string CreatedByUserId { get; set; } = null!;

    [ForeignKey(nameof(CreatedByUserId))]
    public ApplicationUser CreatedBy { get; set; } = null!;

    public ICollection<FormImage> Images { get; set; } = [];
}
