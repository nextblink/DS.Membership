using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Attachments")]
public class Attachment : BaseEntity
{
    public int? AnnouncementId { get; set; }

    [ForeignKey(nameof(AnnouncementId))]
    public Announcement? Announcement { get; set; }

    [Required, MaxLength(500)]
    public string FileName { get; set; } = null!;

    [Required, MaxLength(500)]
    public string StoredName { get; set; } = null!;

    [Required, MaxLength(1000)]
    public string FileUrl { get; set; } = null!;

    public long FileSize { get; set; }

    [Required, MaxLength(100)]
    public string MimeType { get; set; } = null!;
}
