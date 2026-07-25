using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

public class DirectoryEmailSenderTests
{
    [Fact]
    public async Task SendAsync_WritesEmlFileContainingRecipientSubjectAndBody()
    {
        var dir = Path.Combine(Path.GetTempPath(), "marcipano-mail-" + Guid.NewGuid().ToString("N"));
        var options = Options.Create(new EmailOptions
        {
            DeliveryMethod = "Directory",
            PickupDirectory = dir,
            FromAddress = "no-reply@marcipano.local",
            FromName = "Marcipano",
        });
        var sender = new DirectoryEmailSender(options);

        await sender.SendAsync(new EmailMessage
        {
            ToEmail = "user@example.com",
            Subject = "Postavite lozinku",
            HtmlBody = "<p>Zdravo</p>",
        });

        var files = Directory.GetFiles(dir, "*.eml");
        Assert.Single(files);
        var content = await File.ReadAllTextAsync(files[0]);
        Assert.Contains("user@example.com", content);
        Assert.Contains("Postavite lozinku", content, StringComparison.OrdinalIgnoreCase);

        Directory.Delete(dir, recursive: true);
    }
}
