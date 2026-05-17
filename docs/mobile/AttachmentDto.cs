namespace Marcipano.Application.DTOs;

public record AttachmentDto
{
    public string Id { get; init; } = default!;
    public string FileName { get; init; } = default!;
    public string FileUrl { get; init; } = default!;
    public long FileSize { get; init; }
    public string MimeType { get; init; } = default!;
}
