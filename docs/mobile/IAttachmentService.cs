using Marcipano.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace Marcipano.Application.Interfaces;

public interface IAttachmentService
{
    Task<AttachmentDto> UploadAsync(IFormFile file, CancellationToken ct = default);
    Task DeleteAsync(string attachmentId, CancellationToken ct = default);
}
