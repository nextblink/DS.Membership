using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services.Email;

/// <inheritdoc />
public sealed class AccountEmailService : IAccountEmailService
{
    private readonly IEmailSender _sender;
    private readonly EmailOptions _options;

    public AccountEmailService(IEmailSender sender, IOptions<EmailOptions> options)
    {
        _sender = sender;
        _options = options.Value;
    }

    public Task SendSetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        var link = BuildLink(_options.FrontendBaseUrl, toEmail, resetToken, "create");
        var html = Template(
            heading: "Добро дошли",
            intro: "Направљен вам је налог. Кликните на дугме испод да поставите лозинку.",
            buttonLabel: "Постави лозинку",
            link: link);
        return _sender.SendAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = "Postavite lozinku za vaš nalog",
            HtmlBody = html,
        }, ct);
    }

    public Task SendResetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        var link = BuildLink(_options.FrontendBaseUrl, toEmail, resetToken, "reset");
        var html = Template(
            heading: "Ресетовање лозинке",
            intro: "Затражено је ресетовање лозинке. Кликните на дугме испод да поставите нову лозинку. Ако то нисте били ви, игноришите ову поруку.",
            buttonLabel: "Ресетуј лозинку",
            link: link);
        return _sender.SendAsync(new EmailMessage
        {
            ToEmail = toEmail,
            Subject = "Resetovanje lozinke",
            HtmlBody = html,
        }, ct);
    }

    /// <summary>
    /// Builds the SPA link. Exposed for testing.
    /// </summary>
    internal static string BuildLink(string frontendBaseUrl, string email, string token, string mode)
    {
        var baseUrl = frontendBaseUrl.TrimEnd('/');
        return $"{baseUrl}/reset-password" +
               $"?email={Uri.EscapeDataString(email)}" +
               $"&token={Uri.EscapeDataString(token)}" +
               $"&mode={mode}";
    }

    private static string Template(string heading, string intro, string buttonLabel, string link) =>
        $@"<!DOCTYPE html>
<html lang=""sr"">
  <body style=""font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 24px;"">
    <div style=""max-width: 480px; margin: 0 auto;"">
      <h2 style=""color: #111827;"">{heading}</h2>
      <p style=""line-height: 1.5;"">{intro}</p>
      <p style=""margin: 28px 0;"">
        <a href=""{link}""
           style=""background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;"">
          {buttonLabel}
        </a>
      </p>
      <p style=""font-size: 12px; color: #6b7280;"">
        Ако дугме не ради, копирајте овај линк у прегледач:<br />
        <a href=""{link}"" style=""color:#4f46e5;"">{link}</a>
      </p>
    </div>
  </body>
</html>";
}
