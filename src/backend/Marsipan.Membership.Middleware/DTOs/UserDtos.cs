using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// User shape returned by the SuperAdmin-only <c>/api/users</c> endpoints.
/// </summary>
public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string Role { get; set; } = string.Empty;
    public int? CommitteeId { get; set; }
    public string? CommitteeName { get; set; }

    /// <summary>
    /// True when the "set your password" invite email was sent successfully.
    /// False means the user exists but the admin should trigger a resend
    /// (e.g. via forgot-password).
    /// </summary>
    public bool EmailSent { get; set; }
}

/// <summary>
/// Request body for <c>POST /api/users</c>.
/// </summary>
public class CreateUserDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    [Required]
    public string Role { get; set; } = string.Empty;

    public int? CommitteeId { get; set; }
}

/// <summary>
/// Request body for <c>PUT /api/users/{id}</c>.
/// </summary>
public class UpdateUserDto
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    [Required]
    public string Role { get; set; } = string.Empty;

    public int? CommitteeId { get; set; }
}
