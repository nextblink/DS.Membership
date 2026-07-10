using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/campaigns")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CampaignsController : ControllerBase
{
    private readonly ICampaignService _campaigns;

    public CampaignsController(ICampaignService campaigns) => _campaigns = campaigns;

    [HttpGet]
    public async Task<ActionResult<PagedResultDto<CampaignDto>>> List(
        [FromQuery] int page, [FromQuery] int pageSize, CancellationToken ct)
        => Ok(await _campaigns.SearchAsync(page == 0 ? 1 : page, pageSize == 0 ? 20 : pageSize, ct));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CampaignDto>> GetById(int id, CancellationToken ct)
    {
        var c = await _campaigns.GetByIdAsync(id, ct);
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<ActionResult<CampaignDto>> Create([FromBody] CreateCampaignRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var created = await _campaigns.CreateAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCampaignRequest dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        try { await _campaigns.UpdateAsync(id, dto, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        try { await _campaigns.DeleteAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
