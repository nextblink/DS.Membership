namespace Marcipano.Application.Interfaces;

public interface INotificationService
{
    /// <summary>Send to all members matching targeting criteria.</summary>
    Task SendToTargetAsync(
        string? targetLevel,
        string? targetRole,
        string? targetTerritoryId,
        string title,
        string body,
        string route,
        CancellationToken ct = default);

    /// <summary>Send to a specific member (all their devices).</summary>
    Task SendToMemberAsync(
        string memberId,
        string title,
        string body,
        string route,
        CancellationToken ct = default);

    /// <summary>Send a push message directly to a list of FCM tokens.</summary>
    Task SendToTokensAsync(
        IReadOnlyList<string> tokens,
        string title,
        string body,
        string route,
        CancellationToken ct = default);
}
