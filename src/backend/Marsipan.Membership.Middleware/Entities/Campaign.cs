using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Campaigns")]
public class Campaign : BaseEntity
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = null!;

    [MaxLength(2000)]
    public string? Description { get; set; }

    public DateOnly? StartDate { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<CallContact> Contacts { get; set; } = [];

    public ICollection<CallPool> Pools { get; set; } = [];
}
