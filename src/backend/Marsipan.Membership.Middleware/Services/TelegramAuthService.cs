using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Marsipan.Membership.Middleware.Services;

public class TelegramAuthService : ITelegramAuthService
{
    private static readonly TimeSpan MaxAge = TimeSpan.FromHours(1);

    private readonly TelegramOptions _tgOptions;
    private readonly JwtOptions? _jwtOptions;
    private readonly ApplicationContext? _db;

    public TelegramAuthService(IOptions<TelegramOptions> tgOptions, ApplicationContext? db, IOptions<JwtOptions>? jwtOptions = null)
    {
        _tgOptions = tgOptions.Value;
        _db = db;
        _jwtOptions = jwtOptions?.Value;
    }

    public TelegramInitDataPayload? ValidateInitData(string initData)
    {
        if (string.IsNullOrWhiteSpace(initData)) return null;

        var parsed = HttpUtility.ParseQueryString(initData);
        var hash = parsed["hash"];
        if (string.IsNullOrEmpty(hash)) return null;

        var fields = new SortedDictionary<string, string>();
        foreach (string? key in parsed.Keys)
        {
            if (key is null || key == "hash") continue;
            fields[key] = parsed[key] ?? string.Empty;
        }
        var dataCheckString = string.Join("\n", fields.Select(kv => $"{kv.Key}={kv.Value}"));

        var secretKey = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("WebAppData"),
            Encoding.UTF8.GetBytes(_tgOptions.BotToken));
        var expected = Convert.ToHexString(
            HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString))).ToLower();

        if (!string.Equals(expected, hash, StringComparison.OrdinalIgnoreCase)) return null;

        if (!long.TryParse(fields.GetValueOrDefault("auth_date"), out var authDateUnix)) return null;
        var authDate = DateTimeOffset.FromUnixTimeSeconds(authDateUnix);
        if (DateTimeOffset.UtcNow - authDate > MaxAge) return null;

        var userJson = fields.GetValueOrDefault("user") ?? string.Empty;
        var userIdMatch = System.Text.RegularExpressions.Regex.Match(userJson, @"""id""\s*:\s*(\d+)");
        if (!userIdMatch.Success || !long.TryParse(userIdMatch.Groups[1].Value, out var telegramUserId)) return null;

        var usernameMatch = System.Text.RegularExpressions.Regex.Match(userJson, @"""username""\s*:\s*""([^""]+)""");
        var username = usernameMatch.Success ? usernameMatch.Groups[1].Value : null;

        // phone_number comes from requestContact() result appended as contact={json}
        var contactJson = fields.GetValueOrDefault("contact") ?? string.Empty;
        var phoneMatch = System.Text.RegularExpressions.Regex.Match(contactJson, @"""phone_number""\s*:\s*""([^""]+)""");
        var phone = phoneMatch.Success ? phoneMatch.Groups[1].Value : null;

        // Also check raw phone_number field (some Telegram clients use this)
        if (phone is null && fields.TryGetValue("phone_number", out var rawPhone))
            phone = rawPhone;

        return new TelegramInitDataPayload(telegramUserId, username, phone);
    }

    public async Task<TelegramAuthResultDto?> AuthenticateAsync(string initData, string? phoneOverride = null, CancellationToken ct = default)
    {
        var payload = ValidateInitData(initData);
        if (payload is null || _db is null || _jwtOptions is null) return null;

        // Phone override: user typed their number manually — use it instead of initData contact
        if (!string.IsNullOrWhiteSpace(phoneOverride))
            payload = payload with { PhoneNumber = phoneOverride.Trim() };

        var link = await _db.TelegramLinks
            .Include(t => t.Member).ThenInclude(m => m.MemberFunctions)
            .Include(t => t.Member).ThenInclude(m => m.Committee)
            .FirstOrDefaultAsync(t => t.TelegramUserId == payload.TelegramUserId, ct);

        if (link is null)
        {
            if (payload.PhoneNumber is null) return null;

            var normalised = payload.PhoneNumber.Replace(" ", "").Replace("-", "").TrimStart('+');
            var withPlus = "+" + normalised;
            var phone = await _db.Phones
                .Include(p => p.Member).ThenInclude(m => m.MemberFunctions)
                .Include(p => p.Member).ThenInclude(m => m.Committee)
                .FirstOrDefaultAsync(p => p.Number == normalised || p.Number == withPlus, ct);

            if (phone is null) return null;

            link = new TelegramLink
            {
                MemberId = phone.MemberId,
                Member = phone.Member,
                TelegramUserId = payload.TelegramUserId,
                TelegramUsername = payload.TelegramUsername,
                LinkedAt = DateTime.UtcNow,
                CreatedDate = DateTime.UtcNow,
                LastModifiedDate = DateTime.UtcNow,
                CreatedByUserId = phone.MemberId.ToString(),
                LastModifiedByUserId = phone.MemberId.ToString()
            };
            _db.TelegramLinks.Add(link);
            await _db.SaveChangesAsync(ct);
        }
        else if (link.TelegramUsername != payload.TelegramUsername)
        {
            link.TelegramUsername = payload.TelegramUsername;
            link.LastModifiedDate = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        var member = link.Member;
        var functionIds = member.MemberFunctions.Select(mf => mf.FunctionId).ToList();
        var displayName = $"{member.FirstName} {member.LastName}";
        var token = GenerateToken(member, functionIds);

        return new TelegramAuthResultDto(token, member.Id, displayName, member.CommitteeId, functionIds);
    }

    private string GenerateToken(Member member, List<int> functionIds)
    {
        if (_jwtOptions is null) throw new InvalidOperationException("JwtOptions not configured.");

        var keyBytes = Encoding.UTF8.GetBytes(_jwtOptions.SecretKey);
        var creds = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(_jwtOptions.ExpiresMinutes <= 0 ? 60 : _jwtOptions.ExpiresMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, member.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("memberId", member.Id.ToString()),
            new("committeeId", member.CommitteeId.ToString()),
            new("telegramUserId", member.Id.ToString()),
        };
        claims.AddRange(functionIds.Select(fid => new Claim("functionId", fid.ToString())));

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
