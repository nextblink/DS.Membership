using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("FormImages")]
public class FormImage : BaseEntity
{
    [Required]
    public int FormId { get; set; }

    [ForeignKey(nameof(FormId))]
    public Form Form { get; set; } = null!;

    [Required, MaxLength(255)]
    public string FileName { get; set; } = null!;

    [Required, MaxLength(500)]
    public string FilePath { get; set; } = null!;

    [Required]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public int Order { get; set; } = 0;
}
