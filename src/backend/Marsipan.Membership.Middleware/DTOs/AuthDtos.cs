using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Request body for <c>POST /api/auth/login</c>.
/// </summary>
public class LoginRequestDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Current user shape embedded in <see cref="LoginResultDto"/> and returned
/// by <c>GET /api/auth/me</c>.
/// </summary>
public class CurrentUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? OrgUnitId { get; set; }
}

/// <summary>
/// Successful login result — bearer token plus the user shape the SPA needs.
/// </summary>
public class LoginResultDto
{
    public string Token { get; set; } = string.Empty;
    public CurrentUserDto User { get; set; } = new();
}
