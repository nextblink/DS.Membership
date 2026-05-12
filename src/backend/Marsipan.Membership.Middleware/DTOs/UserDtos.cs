using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// User shape returned by the SuperAdmin-only <c>/api/users</c> endpoints.
/// </summary>
public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? OrgUnitId { get; set; }
    public string? OrgUnitName { get; set; }
}

/// <summary>
/// Request body for <c>POST /api/users</c>.
/// </summary>
public class CreateUserDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    public int? OrgUnitId { get; set; }
}

/// <summary>
/// Request body for <c>PUT /api/users/{id}</c>.
/// </summary>
public class UpdateUserDto
{
    [Required]
    public string Role { get; set; } = string.Empty;

    public int? OrgUnitId { get; set; }
}
