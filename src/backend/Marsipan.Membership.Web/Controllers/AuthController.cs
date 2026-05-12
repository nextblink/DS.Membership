using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers;

/// <summary>
/// Authentication endpoints — login, logout, and current-user lookup.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Validate credentials and issue a JWT.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResultDto>> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return Unauthorized();

        var result = await _authService.LoginAsync(request.Email, request.Password);
        if (result is null)
            return Unauthorized();

        return Ok(result);
    }

    /// <summary>
    /// JWT is stateless — the client clears its own token. This endpoint
    /// exists for symmetry with the SPA contract.
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        return NoContent();
    }

    /// <summary>
    /// Return the current authenticated user shape derived from the JWT.
    /// </summary>
    [HttpGet("me")]
    [Authorize(Policy = "ApiPolicy")]
    [ProducesResponseType(typeof(CurrentUserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserDto>> Me()
    {
        var current = await _authService.GetCurrentAsync(User);
        if (current is null)
            return Unauthorized();

        return Ok(current);
    }
}
