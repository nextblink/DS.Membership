using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Functions")]
public class Function : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    public ICollection<MemberFunction> MemberFunctions { get; set; } = [];
}
