using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/telegram/auth")]
public class TelegramAuthController : ControllerBase
{
    private readonly ITelegramAuthService _auth;
    public TelegramAuthController(ITelegramAuthService auth) => _auth = auth;

    public record TelegramAuthRequest(string InitData);

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Auth([FromBody] TelegramAuthRequest request, CancellationToken ct)
    {
        var result = await _auth.AuthenticateAsync(request.InitData, ct);
        if (result is null) return Unauthorized();
        return Ok(result);
    }
}
