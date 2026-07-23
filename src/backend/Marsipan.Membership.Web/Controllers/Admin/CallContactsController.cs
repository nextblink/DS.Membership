using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-contacts")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,Operator")]
public class CallContactsController : ControllerBase
{
    private readonly ICallContactService _contacts;

    public CallContactsController(ICallContactService contacts) => _contacts = contacts;

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<CallContactListItemDto>>> List(
        [FromQuery] CallContactQuery query, CancellationToken ct)
        => Ok(await _contacts.SearchAsync(query, ct));

    [HttpGet("my-pools")]
    public async Task<ActionResult<List<PoolOptionDto>>> MyPools(CancellationToken ct)
        => Ok(await _contacts.ListMyPoolsAsync(ct));

    [HttpGet("next")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<ActionResult<CallContactDetailDto>> Next(CancellationToken ct)
    {
        var c = await _contacts.GetNextForOperatorAsync(ct);
        return c is null ? NoContent() : Ok(c);
    }

    [HttpPost("{id:int}/claim")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<ActionResult<CallContactDetailDto>> Claim(int id, CancellationToken ct)
    {
        try { return Ok(await _contacts.ClaimAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CallContactDetailDto>> GetById(int id, CancellationToken ct)
    {
        var c = await _contacts.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost("import")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<ImportResultDto>> Import(
        [FromForm] int campaignId, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequest(new { error = "file_required" });
        await using var stream = file.OpenReadStream();
        try
        {
            var result = await _contacts.ImportAsync(campaignId, stream, file.FileName, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/outcome")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<IActionResult> SaveOutcome(int id, [FromBody] SaveCallOutcomeRequest dto, CancellationToken ct)
    {
        try { await _contacts.SaveOutcomeAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
    }

    [HttpPost("{id:int}/release")]
    [Authorize(Roles = "SuperAdmin,Admin,Operator")]
    public async Task<IActionResult> ReleaseClaim(int id, CancellationToken ct)
    {
        try { await _contacts.ReleaseClaimAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:int}/match-suggestions")]
    public async Task<ActionResult<List<MemberMatchDto>>> MatchSuggestions(int id, CancellationToken ct)
    {
        try { return Ok(await _contacts.SuggestMemberMatchesAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/link/{memberId:int}")]
    public async Task<IActionResult> Link(int id, int memberId, CancellationToken ct)
    {
        try { await _contacts.LinkToMemberAsync(id, memberId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}/link")]
    public async Task<IActionResult> Unlink(int id, CancellationToken ct)
    {
        try { await _contacts.UnlinkAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpGet("{id:int}/enrollment-prefill")]
    public async Task<ActionResult<EnrollmentPrefillDto>> EnrollmentPrefill(int id, CancellationToken ct)
    {
        var p = await _contacts.GetEnrollmentPrefillAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost("{id:int}/converted/{memberId:int}")]
    public async Task<IActionResult> SetConverted(int id, int memberId, CancellationToken ct)
    {
        try { await _contacts.SetConvertedMemberAsync(id, memberId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
