namespace Marsipan.Membership.Middleware.Options;

/// <summary>
/// Strongly-typed email configuration bound from the "Email" section.
/// <see cref="DeliveryMethod"/> selects the <c>IEmailSender</c> implementation:
/// "Directory" writes .eml files to <see cref="PickupDirectory"/> (local dev),
/// "Smtp" sends via MailKit using the Smtp* fields.
/// </summary>
public class EmailOptions
{
    public string DeliveryMethod { get; set; } = "Directory";
    public string PickupDirectory { get; set; } = "wwwroot/mail-pickup";

    public string SmtpHost { get; set; } = string.Empty;
    public int SmtpPort { get; set; } = 25;
    public string SmtpUser { get; set; } = string.Empty;
    public string SmtpPassword { get; set; } = string.Empty;
    public bool SmtpUseStartTls { get; set; } = true;

    public string FromAddress { get; set; } = "no-reply@marcipano.local";
    public string FromName { get; set; } = "Marcipano";

    /// <summary>
    /// Base URL the admin SPA is reached at; used to build email links. The client is
    /// published into this API's wwwroot, so this is the API's own public URL — override
    /// it per environment (Email__FrontendBaseUrl) with the real host in production.
    /// </summary>
    public string FrontendBaseUrl { get; set; } = "https://localhost:7231";
}
