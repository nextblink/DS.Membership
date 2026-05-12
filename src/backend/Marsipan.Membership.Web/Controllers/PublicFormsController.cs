using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers;

[ApiController]
[Route("api/public/forms")]
[AllowAnonymous]
[EnableCors("PublicUpload")]
public class PublicFormsController : ControllerBase
{
    private readonly IQrTokenService _qrTokenService;
    private readonly IFormImageStorage _imageStorage;
    private readonly ApplicationContext _db;

    public PublicFormsController(
        IQrTokenService qrTokenService,
        IFormImageStorage imageStorage,
        ApplicationContext db)
    {
        _qrTokenService = qrTokenService;
        _imageStorage = imageStorage;
        _db = db;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromQuery] string token,
        IList<IFormFile>? files,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Upload token is required." });

        var (valid, userId) = _qrTokenService.ValidateToken(token);
        if (!valid || string.IsNullOrEmpty(userId))
            return BadRequest(new { message = "Invalid or expired upload token." });

        if (files == null || files.Count == 0)
            return BadRequest(new { message = "At least one file is required." });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        var form = new Form
        {
            ScanDate = DateOnly.FromDateTime(DateTime.Today),
            Status = FormStatus.Pending,
            CreatedByUserId = userId,
            CreatedDate = DateTime.UtcNow,
        };
        try
        {
            _db.Forms.Add(form);
            await _db.SaveChangesAsync(ct);

            for (var i = 0; i < files.Count; i++)
            {
                var (fileName, filePath) = await _imageStorage.SaveAsync(form.Id, files[i], i, ct);
                _db.FormImages.Add(new FormImage
                {
                    FormId = form.Id,
                    FileName = fileName,
                    FilePath = filePath,
                    Order = i,
                });
            }
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return Ok(new { formId = form.Id });
        }
        catch (FileStorageException ex)
        {
            await tx.RollbackAsync(ct);
            await _imageStorage.DeleteAllForFormAsync(form.Id, ct);
            return BadRequest(new { message = ex.Message });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            await _imageStorage.DeleteAllForFormAsync(form.Id, ct);
            return StatusCode(500, new { message = "Upload failed. Please try again." });
        }
    }
}
