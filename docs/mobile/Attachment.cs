namespace Marcipano.Domain.Entities;

public class Attachment
{
    public string Id { get; set; } = default!;
    public string? AnnouncementId { get; set; }  // null until linked to announcement
    public string FileName { get; set; } = default!;
    public string StoredName { get; set; } = default!; // GUID-prefixed, safe for filesystem
    public string FileUrl { get; set; } = default!;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Announcement? Announcement { get; set; }
}
