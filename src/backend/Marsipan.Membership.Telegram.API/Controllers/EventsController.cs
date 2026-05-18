using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/events")]
[Authorize(Policy = "ApiPolicy")]
public class EventsController : ControllerBase
{
    private readonly IEventService _events;
    public EventsController(IEventService events) => _events = events;

    private int MemberId => int.Parse(User.FindFirst("memberId")!.Value);

    [HttpGet]
    public async Task<ActionResult<List<EventDto>>> GetEvents(CancellationToken ct)
    {
        var result = await _events.GetForMemberAsync(MemberId, ct);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetEvent(int id, CancellationToken ct)
    {
        var (evt, members) = await _events.GetDetailAsync(id, MemberId, ct);
        return Ok(new { @event = evt, members });
    }

    [HttpPost]
    public async Task<ActionResult<EventDto>> Create([FromBody] CreateEventRequest request, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        var result = await _events.CreateAsync(MemberId, request, ct);
        return CreatedAtAction(nameof(GetEvent), new { id = result.Id }, result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.DeleteAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> Join(int id, CancellationToken ct)
    {
        try { await _events.JoinAsync(id, MemberId, ct); }
        catch (InvalidOperationException ex) when (ex.Message == "event_inactive")
        { return BadRequest(new { reason = "event_inactive" }); }
        return NoContent();
    }

    [HttpDelete("{id:int}/join")]
    public async Task<IActionResult> Leave(int id, CancellationToken ct)
    {
        await _events.LeaveAsync(id, MemberId, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddEventMemberRequest request, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.AddMemberAsync(id, MemberId, request.MemberId, ct);
        return NoContent();
    }

    [HttpDelete("{id:int}/members/{targetMemberId:int}")]
    public async Task<IActionResult> RemoveMember(int id, int targetMemberId, CancellationToken ct)
    {
        if (!await _events.CanManageAsync(MemberId, ct)) return Forbid();
        await _events.RemoveMemberAsync(id, MemberId, targetMemberId, ct);
        return NoContent();
    }
}
