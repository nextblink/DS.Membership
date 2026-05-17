using Marcipano.Domain.Entities;

namespace Marcipano.Application.Interfaces;

public interface IFcmSubscriptionRepository
{
    Task UpsertAsync(string memberId, string fcmToken, CancellationToken ct = default);
    Task DeleteAsync(string memberId, string fcmToken, CancellationToken ct = default);

    /// <summary>Returns all FCM tokens for members matching the given targeting criteria.</summary>
    Task<IReadOnlyList<string>> GetTokensForTargetAsync(
        string? targetLevel,
        string? targetRole,
        string? targetTerritoryId,
        CancellationToken ct = default);

    /// <summary>Returns all FCM tokens for a specific member.</summary>
    Task<IReadOnlyList<string>> GetTokensForMemberAsync(string memberId, CancellationToken ct = default);

    /// <summary>Returns tokens for members with tasks due within the given window.</summary>
    Task<IReadOnlyList<(string MemberId, string Token, string TaskTitle, DateTime DueDate)>>
        GetTokensForTasksDueTomorrowAsync(CancellationToken ct = default);
}
