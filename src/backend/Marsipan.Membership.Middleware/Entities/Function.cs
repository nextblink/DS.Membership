using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Functions")]
public class Function : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    /// <summary>Scopes this function to a specific committee type. Null = applicable to any type.</summary>
    public CommitteeType? CommitteeType { get; set; }

    /// <summary>Max number of holders per org unit instance. Null = unlimited.</summary>
    public int? MaxNumberOfPeople { get; set; }

    public int SortOrder { get; set; }

    public ICollection<MemberFunction> MemberFunctions { get; set; } = [];
}
