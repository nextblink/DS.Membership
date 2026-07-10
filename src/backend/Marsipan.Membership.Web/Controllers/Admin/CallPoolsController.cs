using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-pools")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CallPoolsController : ControllerBase
{
    private readonly ICallPoolService _pools;

    public CallPoolsController(ICallPoolService pools) => _pools = pools;

    [HttpGet]
    public async Task<ActionResult<List<CallPoolDto>>> List([FromQuery] int? campaignId, CancellationToken ct)
        => Ok(await _pools.ListAsync(campaignId, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CallPoolDto>> GetById(int id, CancellationToken ct)
    {
        var p = await _pools.GetByIdAsync(id, ct);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<ActionResult<CallPoolDto>> Create([FromBody] CreateCallPoolRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var created = await _pools.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCallPoolRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try { await _pools.UpdateAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try { await _pools.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/refresh")]
    public async Task<ActionResult<RefreshResultDto>> Refresh(int id, CancellationToken ct)
    {
        try { return Ok(await _pools.RefreshAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:int}/operators")]
    public async Task<IActionResult> SetOperators(int id, [FromBody] AssignOperatorsRequest dto, CancellationToken ct)
    {
        try { await _pools.SetOperatorsAsync(id, dto.UserIds, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}/operators/{userId}")]
    public async Task<IActionResult> RemoveOperator(int id, string userId, CancellationToken ct)
    {
        await _pools.RemoveOperatorAsync(id, userId, ct);
        return NoContent();
    }
}
