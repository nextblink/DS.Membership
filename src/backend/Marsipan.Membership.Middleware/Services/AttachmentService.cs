using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

public class AttachmentService : IAttachmentService
{
    private readonly ApplicationContext _db;
    private readonly FileStorageOptions _opts;

    public AttachmentService(ApplicationContext db, IOptions<FileStorageOptions> opts)
    {
        _db = db;
        _opts = opts.Value;
    }

    public async Task<AttachmentDto> SaveAsync(IFormFile file, int uploaderMemberId, CancellationToken ct = default)
    {
        if (file.Length > _opts.MaxBytesPerFile)
            throw new ArgumentException($"File exceeds maximum allowed size of {_opts.MaxBytesPerFile} bytes.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (_opts.AllowedExtensions.Length > 0 && !_opts.AllowedExtensions.Contains(ext))
            throw new ArgumentException($"File extension '{ext}' is not allowed.");

        var storedName = $"{Guid.NewGuid():N}_{Path.GetFileName(file.FileName)}";
        var uploadRoot = _opts.UploadRoot ?? "wwwroot/uploads";
        var dir = Path.Combine(uploadRoot, "telegram");
        Directory.CreateDirectory(dir);

        var fullPath = Path.Combine(dir, storedName);
        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, ct);

        var fileUrl = $"/uploads/telegram/{storedName}";

        var attachment = new Attachment
        {
            FileName = file.FileName,
            StoredName = storedName,
            FileUrl = fileUrl,
            FileSize = file.Length,
            MimeType = file.ContentType,
            CreatedDate = DateTime.UtcNow,
            LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = uploaderMemberId.ToString(),
            LastModifiedByUserId = uploaderMemberId.ToString()
        };

        _db.Attachments.Add(attachment);
        await _db.SaveChangesAsync(ct);

        return new AttachmentDto(attachment.Id, attachment.FileName, attachment.FileUrl, attachment.FileSize, attachment.MimeType);
    }
}
