using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// JWT-based <see cref="IAuthService"/> implementation backed by ASP.NET Core
/// Identity.
/// </summary>
public class AuthService : IAuthService
{
    private const string CommitteeIdClaim = "orgUnitId";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly JwtOptions _jwtOptions;
    private readonly IAccountEmailService _accountEmail;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IOptions<JwtOptions> jwtOptions,
        IAccountEmailService accountEmail)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtOptions = jwtOptions.Value;
        _accountEmail = accountEmail;
    }

    public async Task<LoginResultDto?> LoginAsync(string email, string password)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
            return null;

        var check = await _signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: false);
        if (!check.Succeeded)
            return null;

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? string.Empty;

        var token = GenerateToken(user, role);

        return new LoginResultDto
        {
            Token = token,
            User = new CurrentUserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                Role = role,
                CommitteeId = user.CommitteeId,
            },
        };
    }

    public async Task SendPasswordResetAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
            return; // No enumeration: silently succeed.

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        await _accountEmail.SendResetPasswordAsync(user.Email!, token);
    }

    private const string GenericResetError = "Invalid or expired reset link.";

    public async Task<(bool Ok, string? Error, ResetPasswordFailure Failure)> ResetPasswordAsync(
        string email, string token, string newPassword)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
            return (false, GenericResetError, ResetPasswordFailure.InvalidLink);

        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (result.Succeeded)
            return (true, null, ResetPasswordFailure.None);

        // No enumeration: an invalid/expired token must look identical to an
        // unknown email, otherwise an attacker can tell real accounts apart
        // from non-existent ones by comparing the two error messages. Only
        // surface Identity's detailed descriptions for genuine password-policy
        // failures, where the user and token are already proven valid.
        if (result.Errors.Any(e => e.Code == "InvalidToken"))
            return (false, GenericResetError, ResetPasswordFailure.InvalidLink);

        return (
            false,
            string.Join("; ", result.Errors.Select(e => e.Description)),
            ResetPasswordFailure.PasswordPolicy);
    }

    public Task<CurrentUserDto?> GetCurrentAsync(ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                 ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(id))
            return Task.FromResult<CurrentUserDto?>(null);

        var email = user.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? user.FindFirstValue(ClaimTypes.Email)
                    ?? string.Empty;

        var role = user.FindFirstValue(ClaimTypes.Role)
                   ?? user.FindFirstValue("role")
                   ?? string.Empty;

        int? committeeId = null;
        var committeeIdClaimValue = user.FindFirstValue(CommitteeIdClaim);
        if (!string.IsNullOrEmpty(committeeIdClaimValue) && int.TryParse(committeeIdClaimValue, out var parsed))
            committeeId = parsed;

        return Task.FromResult<CurrentUserDto?>(new CurrentUserDto
        {
            Id = id,
            Email = email,
            Role = role,
            CommitteeId = committeeId,
        });
    }

    public string GenerateToken(ApplicationUser user, string role)
    {
        if (string.IsNullOrEmpty(_jwtOptions.SecretKey))
            throw new InvalidOperationException("JWT SecretKey is not configured.");

        var keyBytes = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);
        var creds = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);

        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_jwtOptions.ExpiresMinutes <= 0 ? 60 : _jwtOptions.ExpiresMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Iat,
                new DateTimeOffset(now).ToUnixTimeSeconds().ToString(),
                ClaimValueTypes.Integer64),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Role, role ?? string.Empty),
            new(CommitteeIdClaim, user.CommitteeId?.ToString() ?? string.Empty),
        };

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
