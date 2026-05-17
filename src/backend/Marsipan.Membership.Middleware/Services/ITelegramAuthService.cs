using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public record TelegramInitDataPayload(long TelegramUserId, string? TelegramUsername, string PhoneNumber);

public interface ITelegramAuthService
{
    TelegramInitDataPayload? ValidateInitData(string initData);
    Task<TelegramAuthResultDto?> AuthenticateAsync(string initData, CancellationToken ct = default);
}
