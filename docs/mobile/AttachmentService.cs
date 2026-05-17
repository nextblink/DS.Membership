using Marcipano.Application.DTOs;
using Marcipano.Application.Interfaces;
using Marcipano.Domain.Entities;
using Marcipano.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Marcipano.Infrastructure.Services;

public class AttachmentService : IAttachmentService
{
    private readonly AppDbContext _db;
    private readonly string _uploadRoot;
    private readonly string _baseUrl;

    public AttachmentService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        // e.g. appsettings: "Uploads:Path": "uploads" (relative to wwwroot)
        _uploadRoot = Path.Combine(
            Directory.GetCurrentDirectory(),
            config["Uploads:Path"] ?? "uploads"
        );
        // e.g. "Uploads:BaseUrl": "https://your-server.com/uploads"
        _baseUrl = config["Uploads:BaseUrl"]?.TrimEnd('/') ?? "/uploads";

        Directory.CreateDirectory(_uploadRoot);
    }

    public async Task<AttachmentDto> UploadAsync(IFormFile file, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString();
        var safeFileName = Path.GetFileName(file.FileName); // strip any path traversal
        var storedName = $"{id}_{safeFileName}";
        var filePath = Path.Combine(_uploadRoot, storedName);

        await using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream, ct);

        var attachment = new Attachment
        {
            Id = id,
            FileName = safeFileName,
            StoredName = storedName,
            FileUrl = $"{_baseUrl}/{storedName}",
            FileSize = file.Length,
            MimeType = file.ContentType,
            CreatedAt = DateTime.UtcNow,
            AnnouncementId = null, // linked when announcement is created
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync(ct);

        return new AttachmentDto
        {
            Id = attachment.Id,
            FileName = attachment.FileName,
            FileUrl = attachment.FileUrl,
            FileSize = attachment.FileSize,
            MimeType = attachment.MimeType,
        };
    }

    public async Task DeleteAsync(string attachmentId, CancellationToken ct = default)
    {
        var attachment = await _db.Attachments.FindAsync([attachmentId], ct);
        if (attachment is null) return;

        var filePath = Path.Combine(_uploadRoot, attachment.StoredName);
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _db.Attachments.Remove(attachment);
        await _db.SaveChangesAsync(ct);
    }
}
