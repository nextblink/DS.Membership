namespace Marsipan.Membership.Middleware.Options;

/// <summary>
/// Strongly-typed configuration for local-disk form image storage.
/// Bound from the "FileStorage" configuration section.
/// </summary>
public class FileStorageOptions
{
    /// <summary>
    /// Root directory (relative to the application's content root) under which
    /// uploaded files are written. Defaults to "wwwroot/uploads".
    /// </summary>
    public string UploadRoot { get; set; } = "wwwroot/uploads";

    /// <summary>
    /// Maximum allowed size per uploaded file, in bytes. Defaults to 10 MB.
    /// </summary>
    public long MaxBytesPerFile { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// File extensions accepted by the storage service. Compared
    /// case-insensitively, leading dot required.
    /// </summary>
    public string[] AllowedExtensions { get; set; } =
    {
        ".jpg", ".jpeg", ".png", ".webp", ".pdf"
    };

    /// <summary>
    /// MIME content types accepted by the storage service. Compared
    /// case-insensitively.
    /// </summary>
    public string[] AllowedMimeTypes { get; set; } =
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    };
}
