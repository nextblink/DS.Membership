using System.Security.Cryptography;
using System.Text;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class TelegramAuthServiceTests
{
    private const string BotToken = "123456:ABC-test-token";

    private static string BuildValidInitData(long userId, string phone, int ageSeconds = 0)
    {
        var authDate = DateTimeOffset.UtcNow.AddSeconds(-ageSeconds).ToUnixTimeSeconds();
        var dataFields = new SortedDictionary<string, string>
        {
            ["auth_date"] = authDate.ToString(),
            ["user"] = $"{{\"id\":{userId},\"first_name\":\"Test\"}}",
            ["contact"] = $"{{\"phone_number\":\"{phone}\"}}"
        };

        var dataCheckString = string.Join("\n", dataFields.Select(kv => $"{kv.Key}={kv.Value}"));

        var secretKey = HMACSHA256.HashData(Encoding.UTF8.GetBytes("WebAppData"), Encoding.UTF8.GetBytes(BotToken));
        var hash = Convert.ToHexString(HMACSHA256.HashData(secretKey, Encoding.UTF8.GetBytes(dataCheckString))).ToLower();

        var parts = dataFields.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}").ToList();
        parts.Add($"hash={hash}");
        return string.Join("&", parts);
    }

    [Fact]
    public void ValidateInitData_ValidData_ReturnsPayload()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567");
        var result = sut.ValidateInitData(initData);

        Assert.NotNull(result);
        Assert.Equal(42, result.TelegramUserId);
        Assert.Equal("+381601234567", result.PhoneNumber);
    }

    [Fact]
    public void ValidateInitData_TamperedHash_ReturnsNull()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567") + "tampered";
        var result = sut.ValidateInitData(initData);

        Assert.Null(result);
    }

    [Fact]
    public void ValidateInitData_DataOlderThan5Minutes_ReturnsNull()
    {
        var opts = Options.Create(new TelegramOptions { BotToken = BotToken, MiniAppUrl = "https://example.com" });
        var sut = new TelegramAuthService(opts, null!);

        var initData = BuildValidInitData(userId: 42, phone: "+381601234567", ageSeconds: 310);
        var result = sut.ValidateInitData(initData);

        Assert.Null(result);
    }
}
