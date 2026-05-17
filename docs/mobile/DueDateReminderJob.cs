using Marcipano.Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Marcipano.Infrastructure.BackgroundJobs;

/// <summary>
/// Runs once per day. Finds tasks due tomorrow and sends push reminders
/// to all assigned members who haven't completed them yet.
/// </summary>
public class DueDateReminderJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DueDateReminderJob> _logger;

    // Fire at 08:00 UTC daily
    private static readonly TimeOnly FireAt = new(8, 0);

    public DueDateReminderJob(IServiceProvider services, ILogger<DueDateReminderJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[DueDateReminder] Background job started");

        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = CalculateDelayUntilNextFire();
            _logger.LogInformation("[DueDateReminder] Next run in {Delay}", delay);

            await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested) break;

            await RunAsync(stoppingToken);
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        _logger.LogInformation("[DueDateReminder] Running due-date check");

        try
        {
            // Use a scope because DbContext is scoped
            await using var scope = _services.CreateAsyncScope();
            var subscriptionRepo = scope.ServiceProvider.GetRequiredService<IFcmSubscriptionRepository>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var reminders = await subscriptionRepo.GetTokensForTasksDueTomorrowAsync(ct);

            if (!reminders.Any())
            {
                _logger.LogInformation("[DueDateReminder] No tasks due tomorrow");
                return;
            }

            // Group by task title to batch tokens per task
            var grouped = reminders
                .GroupBy(r => (r.TaskTitle, r.DueDate))
                .ToList();

            foreach (var group in grouped)
            {
                var tokens = group.Select(r => r.Token).Distinct().ToList();
                var dueDate = group.Key.DueDate.ToString("dd MMM");

                await notificationService.SendToTokensAsync(
                    tokens,
                    title: "⏰ Task due tomorrow",
                    body: $"{group.Key.TaskTitle} — due {dueDate}",
                    route: "/tasks",
                    ct);

                _logger.LogInformation(
                    "[DueDateReminder] Sent reminder for '{Task}' to {Count} device(s)",
                    group.Key.TaskTitle, tokens.Count);
            }
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogError(ex, "[DueDateReminder] Error during due-date check");
        }
    }

    private static TimeSpan CalculateDelayUntilNextFire()
    {
        var now = DateTime.UtcNow;
        var nextFire = now.Date.Add(FireAt.ToTimeSpan());

        // If we already passed today's fire time, schedule for tomorrow
        if (nextFire <= now)
            nextFire = nextFire.AddDays(1);

        return nextFire - now;
    }
}
