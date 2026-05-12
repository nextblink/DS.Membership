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

    public ICollection<OrgUnit> Children { get; set; } = [];

    public ICollection<Member> Members { get; set; } = [];
}
