using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/announcements")]
[Authorize(Policy = "ApiPolicy")]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcements;

    public AnnouncementsController(IAnnouncementService announcements) => _announcements = announcements;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpPost]
    public async Task<ActionResult<AnnouncementDto>> Create([FromBody] CreateAnnouncementRequest request, CancellationToken ct)
    {
        var result = await _announcements.CreateAsync(MemberId, request, ct);
        return CreatedAtAction(nameof(Create), new { id = result.Id }, result);
    }

    [HttpPost("{id:int}/like")]
    public async Task<IActionResult> Like(int id, CancellationToken ct)
    {
        await _announcements.LikeAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/like")]
    public async Task<IActionResult> Unlike(int id, CancellationToken ct)
    {
        await _announcements.UnlikeAsync(id, MemberId, ct);
        return NoContent();
    }
}
