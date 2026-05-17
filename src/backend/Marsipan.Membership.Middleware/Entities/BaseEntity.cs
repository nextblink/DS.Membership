using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.Entities;

public abstract class BaseEntity
{
    [Key]
    public int Id { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime LastModifiedDate { get; set; }

    [MaxLength(450)]
    public string CreatedByUserId { get; set; } = null!;

    [MaxLength(450)]
    public string LastModifiedByUserId { get; set; } = null!;

    public bool IsDeleted { get; set; } = false;
}
