namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>
/// Builds and sends account-lifecycle emails (invite / password reset).
/// Both use the same Identity password-reset token; the link's <c>mode</c>
/// query param only changes the copy shown on the SPA page.
/// </summary>
public interface IAccountEmailService
{
    /// <summary>Invite email for a newly created user (mode=create).</summary>
    Task SendSetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default);

    /// <summary>Forgot-password email for an existing user (mode=reset).</summary>
    Task SendResetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default);
}
