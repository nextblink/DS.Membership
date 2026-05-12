using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

/// <summary>
/// Abstract base type for all domain entities. Provides identity, audit
/// fields, and a soft-delete flag. Domain entities (added in issue #5)
/// should inherit from this type.
/// </summary>
public abstract class BaseEntity
{
    [Key]
    public int Id { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? LastModifiedDate { get; set; }

    [MaxLength(450)]
    public string? CreatedByUserId { get; set; }

    [MaxLength(450)]
    public string? LastModifiedByUserId { get; set; }

    public bool IsDeleted { get; set; } = false;
}
