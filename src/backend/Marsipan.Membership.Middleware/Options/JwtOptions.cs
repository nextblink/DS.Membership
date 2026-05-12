namespace Marsipan.Membership.Middleware.Options;

/// <summary>
/// Strongly-typed JWT configuration bound from the <c>"Jwt"</c> section of
/// <c>appsettings.json</c>.
/// </summary>
public class JwtOptions
{
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public int ExpiresMinutes { get; set; } = 60;
}
