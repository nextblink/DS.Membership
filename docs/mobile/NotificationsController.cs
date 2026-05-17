using Marcipano.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marcipano.API.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IFcmSubscriptionRepository _subscriptions;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(
        IFcmSubscriptionRepository subscriptions,
        ICurrentUserService currentUser)
    {
        _subscriptions = subscriptions;
        _currentUser = currentUser;
    }

    /// <summary>Register or refresh an FCM token for the current member.</summary>
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FcmToken))
            return BadRequest("fcmToken is required");

        await _subscriptions.UpsertAsync(_currentUser.MemberId, request.FcmToken);
        return Ok();
    }

    /// <summary>Remove an FCM token (e.g. on logout).</summary>
    [HttpDelete("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] SubscribeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FcmToken))
            return BadRequest("fcmToken is required");

        await _subscriptions.DeleteAsync(_currentUser.MemberId, request.FcmToken);
        return Ok();
    }
}

public record SubscribeRequest(string FcmToken);
