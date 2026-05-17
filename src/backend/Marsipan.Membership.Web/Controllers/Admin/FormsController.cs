using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// Admin/API endpoints for the Forms aggregate. Authentication is required
/// via the <c>ApiPolicy</c> (JWT bearer); status PATCH is additionally gated
/// by role (SuperAdmin, Admin, LocalAdmin). Operator scope (own-uploads-only)
/// is enforced inside <see cref="IFormsService"/> via <c>ApplyFormScope</c>.
/// </summary>
[ApiController]
[Route("api/forms")]
[Authorize(Policy = "ApiPolicy")]
public class FormsController : ControllerBase
{
    private readonly IFormsService _forms;
    private readonly IFormExtractionService _extraction;

    public FormsController(IFormsService forms, IFormExtractionService extraction)
    {
        _forms = forms;
        _extraction = extraction;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResultDto<FormListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<FormListItemDto>>> Search(
        [FromQuery] FormQuery query,
        CancellationToken ct)
    {
        var result = await _forms.SearchAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(FormDetailsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FormDetailsDto>> GetById(int id, CancellationToken ct)
    {
        var dto = await _forms.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>
    /// Multipart upload — metadata fields plus one or more image files.
    /// The <c>CreatedByUserId</c> is taken from the JWT on the server side;
    /// any value posted by the client is ignored.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(FormDetailsDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FormDetailsDto>> Create(
        [FromForm] CreateFormMetadataDto meta,
        [FromForm(Name = "files")] IFormFileCollection? files,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var dto = await _forms.CreateAsync(
            meta,
            (IEnumerable<IFormFile>?)files ?? Array.Empty<IFormFile>(),
            ct);

        return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
    }

    /// <summary>
    /// Sends a single form image to the Claude vision API and returns extracted member data.
    /// Does not persist anything — stateless extraction only.
    /// </summary>
    [HttpPost("extract")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ExtractedFormDataDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ExtractedFormDataDto>> Extract(
        [FromForm(Name = "file")] IFormFile? file,
        CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "An image file is required." });

        var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowed.Contains(file.ContentType?.ToLowerInvariant()))
            return BadRequest(new { message = "Only JPEG, PNG, and WebP images are supported." });

        try
        {
            var result = await _extraction.ExtractAsync(file, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateFormDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var ok = await _forms.UpdateAsync(id, dto, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var ok = await _forms.SoftDeleteAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    /// <summary>
    /// Status transition. Role-gated: SuperAdmin, Admin, LocalAdmin.
    /// Operator is excluded by the role policy here; scope filtering inside
    /// the service further restricts LocalAdmin to its OrgUnit.
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SuperAdmin,Admin,LocalAdmin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetStatus(int id, [FromBody] UpdateFormStatusDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var ok = await _forms.SetStatusAsync(id, dto.Status, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("{id:int}/images")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(IReadOnlyList<FormImageDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<FormImageDto>>> AddImages(
        int id,
        [FromForm(Name = "files")] IFormFileCollection? files,
        CancellationToken ct)
    {
        var added = await _forms.AddImagesAsync(
            id,
            (IEnumerable<IFormFile>?)files ?? Array.Empty<IFormFile>(),
            ct);

        if (added.Count == 0)
            return NotFound();

        return CreatedAtAction(nameof(GetById), new { id }, added);
    }

    [HttpDelete("{formId:int}/images/{imageId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveImage(int formId, int imageId, CancellationToken ct)
    {
        var ok = await _forms.RemoveImageAsync(formId, imageId, ct);
        return ok ? NoContent() : NotFound();
    }

}
