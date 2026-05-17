using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize(Policy = "ApiPolicy")]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachments;
    public AttachmentsController(IAttachmentService attachments) => _attachments = attachments;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpPost("upload")]
    [RequestSizeLimit(10_485_760)]
    public async Task<ActionResult<AttachmentDto>> Upload(IFormFile file, CancellationToken ct)
    {
        var result = await _attachments.SaveAsync(file, MemberId, ct);
        return Ok(result);
    }
}
