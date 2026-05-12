namespace Marsipan.Membership.Middleware.Services;

public interface IQrTokenService
{
    string GenerateToken(string userId, DateTimeOffset expiresAt);
    (bool Valid, string? UserId) ValidateToken(string token);
}
