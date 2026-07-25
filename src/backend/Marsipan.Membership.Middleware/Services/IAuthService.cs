using System.Security.Claims;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Authentication service — validates credentials, issues JWTs, and exposes
/// the current user shape used by the SPA.
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Validates the given credentials. Returns a <see cref="LoginResultDto"/>
    /// on success or <c>null</c> on any failure (user not found, wrong password,
    /// disabled account).
    /// </summary>
    Task<LoginResultDto?> LoginAsync(string email, string password);

    /// <summary>
    /// Reads the current user shape from a JWT <see cref="ClaimsPrincipal"/>.
    /// Returns <c>null</c> when required claims are missing.
    /// </summary>
    Task<CurrentUserDto?> GetCurrentAsync(ClaimsPrincipal user);

    /// <summary>
    /// Generates an HS256-signed JWT for the given user and role.
    /// Carries: <c>sub</c>, <c>email</c>, <c>role</c>, <c>orgUnitId</c>,
    /// <c>jti</c>, <c>iat</c>, <c>exp</c>.
    /// </summary>
    string GenerateToken(ApplicationUser user, string role);

    /// <summary>
    /// Emails a password-reset link if the address matches a user. Always
    /// completes successfully (no user enumeration) — a missing user is a no-op.
    /// </summary>
    Task SendPasswordResetAsync(string email);

    /// <summary>
    /// Applies a new password using an Identity reset token. Returns
    /// <c>Ok</c> on success, otherwise an <see cref="ResetPasswordFailure"/>
    /// describing why so callers can react without parsing the message.
    /// </summary>
    Task<(bool Ok, string? Error, ResetPasswordFailure Failure)> ResetPasswordAsync(
        string email, string token, string newPassword);
}

/// <summary>
/// Why a password reset was refused. Surfaced to the SPA as a stable code so
/// it can localize the message itself rather than echoing the server string —
/// and tell a dead link (stop showing the form) apart from a weak password
/// (keep the form, let the user retry).
/// </summary>
public enum ResetPasswordFailure
{
    /// <summary>The reset succeeded.</summary>
    None = 0,

    /// <summary>
    /// The link cannot be used: unknown address, or a token that is malformed,
    /// expired, or already spent. Deliberately one value for all of these so
    /// the response never reveals whether the account exists.
    /// </summary>
    InvalidLink,

    /// <summary>The link was valid but the chosen password was rejected.</summary>
    PasswordPolicy,
}
