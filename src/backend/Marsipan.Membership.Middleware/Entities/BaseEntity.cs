using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.Entities;

public abstract class BaseEntity
{
    [Key]
    public int Id { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime LastModifiedDate { get; set; }

    [MaxLength(450)]
    public string CreatedByUserId { get; set; } = string.Empty;

    [MaxLength(450)]
    public string LastModifiedByUserId { get; set; } = string.Empty;

    public bool IsDeleted { get; set; } = false;
}
