namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>
/// Sends transactional email. Implementation is selected at DI time by
/// <c>EmailOptions.DeliveryMethod</c>.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
