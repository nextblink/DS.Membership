using Marsipan.Membership.Middleware.DTOs;
using Microsoft.AspNetCore.Http;

namespace Marsipan.Membership.Middleware.Services;

public interface IAttachmentService
{
    Task<AttachmentDto> SaveAsync(IFormFile file, int uploaderMemberId, CancellationToken ct = default);
}
