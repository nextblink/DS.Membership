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
}
