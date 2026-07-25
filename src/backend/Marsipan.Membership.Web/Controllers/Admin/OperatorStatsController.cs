using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// An operator's own calling statistics. Always scoped to the caller — there is
/// deliberately no operator-id parameter, so one operator cannot read another's
/// figures.
/// </summary>
[ApiController]
[Route("api/call-center")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,Operator")]
public class OperatorStatsController : ControllerBase
{
    private readonly IOperatorStatsService _statsService;

    public OperatorStatsController(IOperatorStatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet("my-stats")]
    [ProducesResponseType(typeof(OperatorStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OperatorStatsDto>> MyStats(CancellationToken ct)
    {
        var stats = await _statsService.GetMyStatsAsync(ct);
        return Ok(stats);
    }
}
