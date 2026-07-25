using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>
/// Writes each message as an RFC-822 .eml file to
/// <c>EmailOptions.PickupDirectory</c> instead of sending it. Intended for
/// local development — open the .eml in any mail client to read/click links.
/// </summary>
public sealed class DirectoryEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public DirectoryEmailSender(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        Directory.CreateDirectory(_options.PickupDirectory);

        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.ToEmail));
        mime.Subject = message.Subject;
        mime.Body = new TextPart("html") { Text = message.HtmlBody };

        // Unique, sortable file name. Guid keeps it deterministic-free of clock use.
        var fileName = $"{Guid.NewGuid():N}.eml";
        var path = Path.Combine(_options.PickupDirectory, fileName);

        await using var stream = File.Create(path);
        await mime.WriteToAsync(stream, ct);
    }
}
