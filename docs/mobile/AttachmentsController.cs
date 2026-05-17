using Marcipano.Application.DTOs;
using Marcipano.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marcipano.API.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IAttachmentService _attachmentService;

    public AttachmentsController(IAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    /// <summary>
    /// Upload a file before creating an announcement.
    /// Returns the attachment metadata including ID and URL.
    /// Max size: 10 MB. All file types accepted.
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<ActionResult<AttachmentDto>> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided");

        if (file.Length > 10 * 1024 * 1024)
            return BadRequest("File exceeds 10 MB limit");

        var result = await _attachmentService.UploadAsync(file);
        return Ok(result);
    }

    /// <summary>Delete an attachment by ID (admin / author only).</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        await _attachmentService.DeleteAsync(id);
        return NoContent();
    }
}
