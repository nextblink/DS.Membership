using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using global::Telegram.Bot;
using global::Telegram.Bot.Types.ReplyMarkups;

namespace Marsipan.Membership.Telegram.API.Services;

public class TelegramBotService : IAnnouncementNotifier, IHostedService
{
    private readonly TelegramOptions _opts;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TelegramBotService> _logger;
    private TelegramBotClient? _botClient;

    public TelegramBotService(
        IOptions<TelegramOptions> opts,
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramBotService> logger)
    {
        _opts = opts.Value;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(_opts.BotToken) && _opts.BotToken != "REPLACE_WITH_BOT_TOKEN")
            _botClient = new TelegramBotClient(_opts.BotToken);
        else
            _logger.LogWarning("Telegram BotToken not configured — bot notifications disabled.");
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

    public async Task NotifyAsync(Announcement announcement, CancellationToken ct = default)
    {
        if (_botClient is null) return;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationContext>();

        var memberFunctionIds = announcement.TargetFunctionId.HasValue
            ? await db.MemberFunctions
                .Where(mf => mf.FunctionId == announcement.TargetFunctionId.Value)
                .Select(mf => mf.MemberId).ToHashSetAsync(ct)
            : null;

        var linksQuery = db.TelegramLinks
            .Include(t => t.Member).ThenInclude(m => m.Committee)
            .Where(t => !t.IsDeleted);

        if (announcement.TargetCommitteeId.HasValue)
            linksQuery = linksQuery.Where(t => t.Member.CommitteeId == announcement.TargetCommitteeId.Value);

        if (announcement.TargetLevel.HasValue)
            linksQuery = linksQuery.Where(t => t.Member.Committee.Type == announcement.TargetLevel.Value);

        var links = await linksQuery.ToListAsync(ct);

        if (memberFunctionIds is not null)
            links = links.Where(t => memberFunctionIds.Contains(t.MemberId)).ToList();

        var button = new InlineKeyboardMarkup(
            InlineKeyboardButton.WithWebApp("Read", new global::Telegram.Bot.Types.WebAppInfo { Url = _opts.MiniAppUrl }));

        var batches = links.Chunk(30);
        foreach (var batch in batches)
        {
            var tasks = batch.Select(link =>
                _botClient.SendMessage(
                    chatId: link.TelegramUserId,
                    text: $"📢 *{EscapeMarkdown(announcement.Title)}*",
                    parseMode: global::Telegram.Bot.Types.Enums.ParseMode.MarkdownV2,
                    replyMarkup: button,
                    cancellationToken: ct)
                .ContinueWith(t =>
                {
                    if (t.IsFaulted)
                        _logger.LogWarning("Failed to notify TelegramUserId {Id}: {Err}", link.TelegramUserId, t.Exception?.Message);
                }, CancellationToken.None));

            await Task.WhenAll(tasks);
            await Task.Delay(1100, ct);
        }
    }

    private static string EscapeMarkdown(string text) =>
        System.Text.RegularExpressions.Regex.Replace(text, @"([_*\[\]()~`>#+\-=|{}.!\\])", @"\$1");
}
