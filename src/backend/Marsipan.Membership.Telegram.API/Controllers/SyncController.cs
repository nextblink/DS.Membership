using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/sync")]
[Authorize(Policy = "ApiPolicy")]
public class SyncController : ControllerBase
{
    private readonly ISyncService _sync;
    public SyncController(ISyncService sync) => _sync = sync;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpGet]
    public async Task<ActionResult<SyncResponseDto>> Sync([FromQuery] DateTime? since, CancellationToken ct)
    {
        var result = await _sync.GetDeltaAsync(MemberId, since, ct);
        return Ok(result);
    }
}
