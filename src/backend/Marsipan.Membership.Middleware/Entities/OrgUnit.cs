using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("OrgUnits")]
public class OrgUnit : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    public OrgUnitType Type { get; set; }

    public int? ParentId { get; set; }

    [ForeignKey(nameof(ParentId))]
    public OrgUnit? Parent { get; set; }

    public int VoterCount { get; set; }

    public int? MunicipalityId { get; set; }

    [ForeignKey(nameof(MunicipalityId))]
    public Municipality? Municipality { get; set; }

    public int? TrusteeId { get; set; }

    [ForeignKey(nameof(TrusteeId))]
    public Member? Trustee { get; set; }

    public bool IsTrustful { get; set; } = true;

    /// <summary>Display-only capacity hint for national bodies (150 / 10 / 10). Null = no limit.</summary>
    public int? MaxMembers { get; set; }

    public ICollection<OrgUnit> Children { get; set; } = [];

    public ICollection<Member> Members { get; set; } = [];
}
