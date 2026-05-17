using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Marcipano.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Marcipano.Infrastructure.Services;

public class FcmNotificationService : INotificationService
{
    private readonly IFcmSubscriptionRepository _subscriptions;
    private readonly ILogger<FcmNotificationService> _logger;

    public FcmNotificationService(
        IFcmSubscriptionRepository subscriptions,
        ILogger<FcmNotificationService> logger)
    {
        _subscriptions = subscriptions;
        _logger = logger;
    }

    public async Task SendToTargetAsync(
        string? targetLevel, string? targetRole, string? targetTerritoryId,
        string title, string body, string route,
        CancellationToken ct = default)
    {
        var tokens = await _subscriptions.GetTokensForTargetAsync(
            targetLevel, targetRole, targetTerritoryId, ct);

        await SendToTokensAsync(tokens, title, body, route, ct);
    }

    public async Task SendToMemberAsync(
        string memberId, string title, string body, string route,
        CancellationToken ct = default)
    {
        var tokens = await _subscriptions.GetTokensForMemberAsync(memberId, ct);
        await SendToTokensAsync(tokens, title, body, route, ct);
    }

    public async Task SendToTokensAsync(
        IReadOnlyList<string> tokens,
        string title, string body, string route,
        CancellationToken ct = default)
    {
        if (!tokens.Any()) return;

        // FCM allows max 500 tokens per MulticastMessage
        foreach (var batch in tokens.Chunk(500))
        {
            var message = new MulticastMessage
            {
                Tokens = batch.ToList(),
                Notification = new Notification { Title = title, Body = body },
                Data = new Dictionary<string, string> { ["route"] = route },
                Android = new AndroidConfig
                {
                    Priority = Priority.High,
                    Notification = new AndroidNotification
                    {
                        Title = title,
                        Body = body,
                        Sound = "default",
                        ClickAction = "FLUTTER_NOTIFICATION_CLICK", // standard for Capacitor
                    },
                },
            };

            try
            {
                var response = await FirebaseMessaging.DefaultInstance.SendEachForMulticastAsync(message, ct);
                _logger.LogInformation(
                    "[FCM] Sent {Success}/{Total} notifications for route {Route}",
                    response.SuccessCount, batch.Length, route);

                if (response.FailureCount > 0)
                {
                    LogFailures(response, batch);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[FCM] Failed to send batch for route {Route}", route);
            }
        }
    }

    private void LogFailures(BatchResponse response, string[] tokens)
    {
        for (int i = 0; i < response.Responses.Count; i++)
        {
            if (!response.Responses[i].IsSuccess)
            {
                _logger.LogWarning(
                    "[FCM] Token failed: {Error} (token index {Index})",
                    response.Responses[i].Exception?.Message, i);
                // TODO: remove stale tokens from DB on MessagingErrorCode.Unregistered
            }
        }
    }
}
