using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

/// <summary>
/// Read-only dashboard stats endpoint. Restricted to SuperAdmin, Admin, and
/// LocalAdmin via role-based authorization (Viewer/Operator cannot access).
/// </summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin,LocalAdmin")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboard;

    public DashboardController(IDashboardService dashboard)
    {
        _dashboard = dashboard;
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(DashboardStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardStatsDto>> GetStats(CancellationToken ct)
    {
        var stats = await _dashboard.GetStatsAsync(ct);
        return Ok(stats);
    }
}
