using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

public class QrTokenService : IQrTokenService
{
    private readonly QrUploadOptions _options;

    public QrTokenService(IOptions<QrUploadOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateToken(string userId, DateTimeOffset expiresAt)
    {
        var payload = new QrTokenPayload
        {
            UserId = userId,
            Exp = expiresAt.ToUnixTimeSeconds()
        };
        var payloadBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
        var payloadB64 = Base64UrlEncode(payloadBytes);
        var sig = ComputeHmac(payloadB64);
        return $"{payloadB64}.{sig}";
    }

    public (bool Valid, string? UserId) ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return (false, null);

        var parts = token.Split('.');
        if (parts.Length != 2) return (false, null);

        var expectedSig = ComputeHmac(parts[0]);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSig),
                Encoding.UTF8.GetBytes(parts[1])))
            return (false, null);

        try
        {
            var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            var payload = JsonSerializer.Deserialize<QrTokenPayload>(json);
            if (payload is null) return (false, null);
            if (DateTimeOffset.FromUnixTimeSeconds(payload.Exp) <= DateTimeOffset.UtcNow)
                return (false, null);
            return (true, payload.UserId);
        }
        catch
        {
            return (false, null);
        }
    }

    private string ComputeHmac(string data)
    {
        var key = Encoding.UTF8.GetBytes(_options.Secret);
        var bytes = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(data));
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += (s.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(s);
    }
}

internal record QrTokenPayload
{
    [JsonPropertyName("userId")] public string UserId { get; init; } = string.Empty;
    [JsonPropertyName("exp")]    public long Exp    { get; init; }
}
