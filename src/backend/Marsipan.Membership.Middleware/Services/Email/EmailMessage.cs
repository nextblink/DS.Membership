namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>A single outbound email.</summary>
public sealed class EmailMessage
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
}
