using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class CapturingEmailSender : IEmailSender
{
    public EmailMessage? Last { get; private set; }
    public Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        Last = message;
        return Task.CompletedTask;
    }
}

public class AccountEmailServiceTests
{
    private static AccountEmailService Build(IEmailSender sender) =>
        new(sender, Options.Create(new EmailOptions
        {
            FrontendBaseUrl = "http://localhost:5185",
        }));

    [Fact]
    public void BuildLink_EncodesEmailAndTokenAndMode()
    {
        var link = AccountEmailService.BuildLink(
            "http://localhost:5185", "a b@example.com", "tok/en+1", "create");

        Assert.Equal(
            "http://localhost:5185/reset-password?email=a%20b%40example.com&token=tok%2Fen%2B1&mode=create",
            link);
    }

    [Fact]
    public async Task SendSetPasswordAsync_SendsToRecipientWithCreateLink()
    {
        var sender = new CapturingEmailSender();
        var svc = Build(sender);

        await svc.SendSetPasswordAsync("user@example.com", "TOKEN123");

        Assert.NotNull(sender.Last);
        Assert.Equal("user@example.com", sender.Last!.ToEmail);
        Assert.Contains("mode=create", sender.Last.HtmlBody);
        Assert.Contains("token=TOKEN123", sender.Last.HtmlBody);
    }

    [Fact]
    public async Task SendResetPasswordAsync_UsesResetMode()
    {
        var sender = new CapturingEmailSender();
        var svc = Build(sender);

        await svc.SendResetPasswordAsync("user@example.com", "TOKEN123");

        Assert.Contains("mode=reset", sender.Last!.HtmlBody);
    }
}
