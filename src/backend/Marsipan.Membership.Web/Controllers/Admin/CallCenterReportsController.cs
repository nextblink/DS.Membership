using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers.Admin;

[ApiController]
[Route("api/call-center/reports")]
[Authorize(Policy = "ApiPolicy", Roles = "SuperAdmin,Admin")]
public class CallCenterReportsController : ControllerBase
{
    private readonly ICallCenterReportService _reports;

    public CallCenterReportsController(ICallCenterReportService reports) => _reports = reports;

    [HttpGet]
    public async Task<ActionResult<CallCenterReportDto>> Get([FromQuery] CallCenterReportQuery query, CancellationToken ct)
        => Ok(await _reports.GetReportAsync(query, ct));
}
