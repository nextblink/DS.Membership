# Email + Account Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transactional email (with a local directory-delivery fallback) and use it to drive an invite-on-create flow and a self-service forgot/reset-password flow.

**Architecture:** A new `Services/Email/` layer in the Middleware project exposes `IEmailSender` with two implementations (`SmtpEmailSender` via MailKit, `DirectoryEmailSender` writing `.eml` files), selected by `EmailOptions.DeliveryMethod`. `AccountEmailService` builds Serbian HTML bodies and links pointing at the SPA. `UsersService.CreateAsync` stops taking a password and instead emails an Identity reset-token link; `AuthService`/`AuthController` gain public `forgot-password`/`reset-password` endpoints. The SPA gets two public pages (one shared reset page + a forgot page) and drops the create-user password field.

**Tech Stack:** .NET 10, ASP.NET Core Identity, MailKit/MimeKit, EF Core (SQL Server), xUnit + EF InMemory; React 19 + Vite + Tailwind v4, react-hook-form, react-router-dom, i18next.

## Global Constraints

- Target framework `net10.0`; frontend is JavaScript `.jsx` (no TypeScript).
- Options POCOs live in `Marsipan.Membership.Middleware/Options/`, namespace `Marsipan.Membership.Middleware.Options`, plain public properties with defaults (`= string.Empty`), bound via `builder.Services.Configure<XOptions>(config.GetSection("Section"))`.
- Services live in `Marsipan.Membership.Middleware/Services/`, registered in `Program.cs` inside a `// --- Feature --- ... // --- end Feature ---` block.
- Email link format: `{FrontendBaseUrl}/reset-password?email={urlEncoded}&token={urlEncoded}&mode={create|reset}`. Same Identity password-reset token for both modes.
- Email copy: **Serbian only**, simple HTML.
- Forgot-password endpoint MUST always return `200` regardless of whether the email exists (no user enumeration).
- Create-user email failure MUST NOT roll back the user; surface a warning instead.
- Conventional commits, reference no issue numbers (executing without GitHub). Branch: `issue/email-account-flows` (or current working branch per executor).
- Never commit real SMTP/secret values.
- Dev default `Email:DeliveryMethod` = `Directory`; pickup dir `wwwroot/mail-pickup` (gitignored).

---

### Task 1: EmailOptions + IEmailSender + DirectoryEmailSender

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Options/EmailOptions.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/IEmailSender.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/EmailMessage.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/DirectoryEmailSender.cs`
- Modify: `src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
- Test: `src/backend/Marsipan.Membership.Tests/Services/DirectoryEmailSenderTests.cs`

**Interfaces:**
- Produces:
  - `EmailOptions` with `string DeliveryMethod = "Directory"`, `string PickupDirectory = "wwwroot/mail-pickup"`, `string SmtpHost = ""`, `int SmtpPort = 25`, `string SmtpUser = ""`, `string SmtpPassword = ""`, `bool SmtpUseStartTls = true`, `string FromAddress = "no-reply@marcipano.local"`, `string FromName = "Marcipano"`, `string FrontendBaseUrl = "http://localhost:5185"`.
  - `interface IEmailSender { Task SendAsync(EmailMessage message, CancellationToken ct = default); }`
  - `sealed class EmailMessage { string ToEmail; string Subject; string HtmlBody; }` (all `= string.Empty` defaults).
  - `sealed class DirectoryEmailSender : IEmailSender` — ctor takes `IOptions<EmailOptions>`; writes one `.eml` file per message into `PickupDirectory`, returns the written file path via nothing (void Task) but creates the dir if missing.

- [ ] **Step 1: Add MailKit package to the Middleware csproj**

Add inside the existing `<ItemGroup>` that lists PackageReferences in `src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`:

```xml
    <PackageReference Include="MailKit" Version="4.8.0" />
```

Run: `dotnet restore src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: restore succeeds, MailKit + MimeKit resolved.

- [ ] **Step 2: Create EmailOptions**

`src/backend/Marsipan.Membership.Middleware/Options/EmailOptions.cs`:

```csharp
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

    /// <summary>Base URL of the admin SPA; used to build email links.</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5185";
}
```

- [ ] **Step 3: Create EmailMessage + IEmailSender**

`src/backend/Marsipan.Membership.Middleware/Services/Email/EmailMessage.cs`:

```csharp
namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>A single outbound email.</summary>
public sealed class EmailMessage
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
}
```

`src/backend/Marsipan.Membership.Middleware/Services/Email/IEmailSender.cs`:

```csharp
namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>
/// Sends transactional email. Implementation is selected at DI time by
/// <c>EmailOptions.DeliveryMethod</c>.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken ct = default);
}
```

- [ ] **Step 4: Write the failing DirectoryEmailSender test**

`src/backend/Marsipan.Membership.Tests/Services/DirectoryEmailSenderTests.cs`:

```csharp
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
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter DirectoryEmailSenderTests`
Expected: FAIL — `DirectoryEmailSender` does not exist (compile error).

- [ ] **Step 6: Implement DirectoryEmailSender**

`src/backend/Marsipan.Membership.Middleware/Services/Email/DirectoryEmailSender.cs`:

```csharp
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
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter DirectoryEmailSenderTests`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Options/EmailOptions.cs \
        src/backend/Marsipan.Membership.Middleware/Services/Email/ \
        src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj \
        src/backend/Marsipan.Membership.Tests/Services/DirectoryEmailSenderTests.cs
git commit -m "feat: add EmailOptions, IEmailSender and directory-delivery sender"
```

---

### Task 2: SmtpEmailSender (MailKit)

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/SmtpEmailSender.cs`

**Interfaces:**
- Consumes: `IEmailSender`, `EmailMessage`, `EmailOptions` (Task 1).
- Produces: `sealed class SmtpEmailSender : IEmailSender` — ctor `IOptions<EmailOptions>`; sends via MailKit.

> No unit test: exercising a live SMTP handshake needs an integration server out of scope here. Correctness is verified by build + the manual SMTP smoke in Task 9 notes. The default dev path uses `DirectoryEmailSender`.

- [ ] **Step 1: Implement SmtpEmailSender**

`src/backend/Marsipan.Membership.Middleware/Services/Email/SmtpEmailSender.cs`:

```csharp
using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;

namespace Marsipan.Membership.Middleware.Services.Email;

/// <summary>
/// Sends email through a real SMTP server via MailKit. Selected when
/// <c>EmailOptions.DeliveryMethod</c> == "Smtp".
/// </summary>
public sealed class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public SmtpEmailSender(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken ct = default)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        mime.To.Add(MailboxAddress.Parse(message.ToEmail));
        mime.Subject = message.Subject;
        mime.Body = new TextPart("html") { Text = message.HtmlBody };

        using var client = new SmtpClient();
        var socketOptions = _options.SmtpUseStartTls
            ? SecureSocketOptions.StartTlsWhenAvailable
            : SecureSocketOptions.Auto;

        await client.ConnectAsync(_options.SmtpHost, _options.SmtpPort, socketOptions, ct);
        if (!string.IsNullOrEmpty(_options.SmtpUser))
            await client.AuthenticateAsync(_options.SmtpUser, _options.SmtpPassword, ct);
        await client.SendAsync(mime, ct);
        await client.DisconnectAsync(true, ct);
    }
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `dotnet build src/backend/Marsipan.Membership.Middleware/Marsipan.Membership.Middleware.csproj`
Expected: Build succeeded.

- [ ] **Step 3: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/Email/SmtpEmailSender.cs
git commit -m "feat: add MailKit SMTP email sender"
```

---

### Task 3: AccountEmailService (link building + Serbian templates)

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/IAccountEmailService.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/Email/AccountEmailService.cs`
- Test: `src/backend/Marsipan.Membership.Tests/Services/AccountEmailServiceTests.cs`

**Interfaces:**
- Consumes: `IEmailSender`, `EmailMessage`, `EmailOptions` (Task 1).
- Produces:
  - `interface IAccountEmailService`:
    - `Task SendSetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)` → link `mode=create`, subject `"Postavite lozinku za vaš nalog"`.
    - `Task SendResetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)` → link `mode=reset`, subject `"Resetovanje lozinke"`.
  - `AccountEmailService.BuildLink(string toEmail, string token, string mode)` is `internal static` so the test can assert the URL. Link = `{FrontendBaseUrl}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}&mode={mode}`.

- [ ] **Step 1: Write the failing test**

`src/backend/Marsipan.Membership.Tests/Services/AccountEmailServiceTests.cs`:

```csharp
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
    private static AccountEmailService Build(CapturingEmailSender sender) =>
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter AccountEmailServiceTests`
Expected: FAIL — `AccountEmailService` / `IAccountEmailService` do not exist.

- [ ] **Step 3: Create the interface**

`src/backend/Marsipan.Membership.Middleware/Services/Email/IAccountEmailService.cs`:

```csharp
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
```

- [ ] **Step 4: Implement AccountEmailService**

`src/backend/Marsipan.Membership.Middleware/Services/Email/AccountEmailService.cs`:

```csharp
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
```

> Note: `BuildLink` takes 4 args `(frontendBaseUrl, email, token, mode)` — the Step 1 test and this implementation must stay in sync on that signature.

- [ ] **Step 5: Run the test to verify it passes**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter AccountEmailServiceTests`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/Services/Email/IAccountEmailService.cs \
        src/backend/Marsipan.Membership.Middleware/Services/Email/AccountEmailService.cs \
        src/backend/Marsipan.Membership.Tests/Services/AccountEmailServiceTests.cs
git commit -m "feat: add AccountEmailService with Serbian invite/reset templates"
```

---

### Task 4: Wire up DI + config

**Files:**
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs` (add Email block after the AI extraction block, ~line 74)
- Modify: `src/backend/Marsipan.Membership.Web/appsettings.json`
- Modify: `src/backend/Marsipan.Membership.Web/appsettings.Development.json`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Consumes: `EmailOptions`, `IEmailSender`, `DirectoryEmailSender`, `SmtpEmailSender`, `IAccountEmailService`, `AccountEmailService`.
- Produces: DI-resolvable `IEmailSender` (selected by config) and `IAccountEmailService`.

- [ ] **Step 1: Add the Email DI block to Program.cs**

In `src/backend/Marsipan.Membership.Web/Program.cs`, immediately after the `// --- end Form AI extraction ---` line (currently line 74), insert:

```csharp
// --- Email ---
builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailSender>(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<EmailOptions>>();
    return string.Equals(opts.Value.DeliveryMethod, "Smtp", StringComparison.OrdinalIgnoreCase)
        ? new SmtpEmailSender(opts)
        : new DirectoryEmailSender(opts);
});
builder.Services.AddScoped<IAccountEmailService, AccountEmailService>();
// --- end Email ---
```

Add the using at the top of `Program.cs` (after the existing `Marsipan.Membership.Middleware.Services;` using):

```csharp
using Marsipan.Membership.Middleware.Services.Email;
```

- [ ] **Step 2: Add the Email section to appsettings.json**

In `src/backend/Marsipan.Membership.Web/appsettings.json`, add a top-level `"Email"` section (SMTP fields blank; production overrides `DeliveryMethod` + credentials via env/user-secrets):

```json
  "Email": {
    "DeliveryMethod": "Directory",
    "PickupDirectory": "wwwroot/mail-pickup",
    "SmtpHost": "",
    "SmtpPort": 25,
    "SmtpUser": "",
    "SmtpPassword": "",
    "SmtpUseStartTls": true,
    "FromAddress": "no-reply@marcipano.local",
    "FromName": "Marcipano",
    "FrontendBaseUrl": "http://localhost:5185"
  }
```

- [ ] **Step 3: Add the Email section to appsettings.Development.json**

In `src/backend/Marsipan.Membership.Web/appsettings.Development.json`, add:

```json
  "Email": {
    "DeliveryMethod": "Directory",
    "PickupDirectory": "wwwroot/mail-pickup",
    "FromAddress": "no-reply@marcipano.local",
    "FromName": "Marcipano",
    "FrontendBaseUrl": "http://localhost:5185"
  }
```

(Insert as a sibling of the existing `"ConnectionStrings"`/`"Jwt"` keys — mind the trailing commas.)

- [ ] **Step 4: Gitignore the pickup directory**

Append to the repo-root `.gitignore`:

```
# Local dev email pickup (directory-delivery fallback)
src/backend/Marsipan.Membership.Web/wwwroot/mail-pickup/
```

- [ ] **Step 5: Build to verify wiring compiles**

Run: `dotnet build src/backend/Marsipan.Membership.Web/Marsipan.Membership.Web.csproj`
Expected: Build succeeded.

- [ ] **Step 6: Commit**

```bash
git add src/backend/Marsipan.Membership.Web/Program.cs \
        src/backend/Marsipan.Membership.Web/appsettings.json \
        src/backend/Marsipan.Membership.Web/appsettings.Development.json \
        .gitignore
git commit -m "feat: wire email sender + account email service into DI and config"
```

---

### Task 5: Invite-on-create — drop create password, email a set-password link

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/UserDtos.cs` (remove `Password` from `CreateUserDto`)
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/UserDtos.cs` (add `bool EmailSent` to `UserDto`)
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/UsersService.cs` (`CreateAsync`)
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/UsersService.cs` (ctor: inject `IAccountEmailService`, `ILogger<UsersService>`)
- Modify: `src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj` (add ASP.NET Core framework reference for Identity/DataProtection types)
- Test: `src/backend/Marsipan.Membership.Tests/Services/UsersServiceCreateTests.cs`

**Interfaces:**
- Consumes: `IAccountEmailService.SendSetPasswordAsync` (Task 3).
- Produces:
  - `CreateUserDto` no longer has `Password`.
  - `UserDto` gains `public bool EmailSent { get; set; }`.
  - `UsersService` ctor signature becomes `(UserManager<ApplicationUser>, RoleManager<IdentityRole>, ApplicationContext, IAccountEmailService, ILogger<UsersService>)`.
  - `CreateAsync` creates the user with a random unusable password, generates a reset token, attempts `SendSetPasswordAsync`, and sets `UserDto.EmailSent` = success (never throws on email failure).

- [ ] **Step 1: Ensure the test project can resolve Identity/DataProtection types**

The test uses `UserManager`, `UserStore`, `DataProtectorTokenProvider`, and
`EphemeralDataProtectionProvider`. Add the ASP.NET Core framework reference to
`src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj` inside
the existing `<ItemGroup>` that holds the `<FrameworkReference>`/`<Using>` (or a
new `<ItemGroup>`):

```xml
    <FrameworkReference Include="Microsoft.AspNetCore.App" />
```

Run: `dotnet restore src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj`
Expected: restore succeeds.

- [ ] **Step 2: Write the failing test**

`src/backend/Marsipan.Membership.Tests/Services/UsersServiceCreateTests.cs`:

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class RecordingAccountEmail : IAccountEmailService
{
    public int SetPasswordCalls { get; private set; }
    public bool Throw { get; set; }
    public Task SendSetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
    {
        SetPasswordCalls++;
        if (Throw) throw new InvalidOperationException("smtp down");
        return Task.CompletedTask;
    }
    public Task SendResetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
        => Task.CompletedTask;
}

public class UsersServiceCreateTests
{
    private static ApplicationContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<ApplicationContext>().UseInMemoryDatabase(name).Options);

    // Builds a UserManager over the InMemory store with the SuperAdmin role
    // present and the Default reset-token provider registered (CreateAsync calls
    // GeneratePasswordResetTokenAsync, which needs a token provider).
    private static (UsersService svc, RecordingAccountEmail email) BuildService(
        ApplicationContext db, RecordingAccountEmail? email = null)
    {
        var userStore = new UserStore<ApplicationUser>(db);
        var idOptions = Options.Create(new IdentityOptions());
        var userManager = new UserManager<ApplicationUser>(
            userStore, idOptions, new PasswordHasher<ApplicationUser>(),
            new IUserValidator<ApplicationUser>[] { new UserValidator<ApplicationUser>() },
            new IPasswordValidator<ApplicationUser>[] { new PasswordValidator<ApplicationUser>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(), null!,
            NullLogger<UserManager<ApplicationUser>>.Instance);
        userManager.RegisterTokenProvider(
            TokenOptions.DefaultProvider,
            new DataProtectorTokenProvider<ApplicationUser>(
                new Microsoft.AspNetCore.DataProtection.EphemeralDataProtectionProvider(),
                Options.Create(new DataProtectionTokenProviderOptions()),
                NullLogger<DataProtectorTokenProvider<ApplicationUser>>.Instance));
        idOptions.Value.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultProvider;

        var roleStore = new RoleStore<IdentityRole>(db);
        var roleManager = new RoleManager<IdentityRole>(
            roleStore, Array.Empty<IRoleValidator<IdentityRole>>(),
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(), NullLogger<RoleManager<IdentityRole>>.Instance);
        roleManager.CreateAsync(new IdentityRole(ScopeFilters.RoleSuperAdmin)).GetAwaiter().GetResult();

        email ??= new RecordingAccountEmail();
        var svc = new UsersService(userManager, roleManager, db, email,
            NullLogger<UsersService>.Instance);
        return (svc, email);
    }

    [Fact]
    public async Task CreateAsync_SendsSetPasswordEmail_AndReportsEmailSent()
    {
        await using var db = NewDb(nameof(CreateAsync_SendsSetPasswordEmail_AndReportsEmailSent));
        var (svc, email) = BuildService(db);

        var dto = new CreateUserDto { Email = "new@example.com", Role = ScopeFilters.RoleSuperAdmin };
        var result = await svc.CreateAsync(dto, CancellationToken.None);

        Assert.Equal(1, email.SetPasswordCalls);
        Assert.True(result.EmailSent);
    }

    [Fact]
    public async Task CreateAsync_EmailFailure_KeepsUser_AndReportsEmailNotSent()
    {
        await using var db = NewDb(nameof(CreateAsync_EmailFailure_KeepsUser_AndReportsEmailNotSent));
        var (svc, email) = BuildService(db, new RecordingAccountEmail { Throw = true });

        var dto = new CreateUserDto { Email = "new2@example.com", Role = ScopeFilters.RoleSuperAdmin };
        var result = await svc.CreateAsync(dto, CancellationToken.None);

        Assert.False(result.EmailSent);
        Assert.NotNull(await db.Users.FirstOrDefaultAsync(u => u.Email == "new2@example.com"));
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter UsersServiceCreateTests`
Expected: FAIL — `CreateUserDto` still requires `Password`; `UserDto.EmailSent` missing; `UsersService` ctor arity mismatch.

- [ ] **Step 4: Update the DTOs**

In `src/backend/Marsipan.Membership.Middleware/DTOs/UserDtos.cs`:

Add to `UserDto` (after `CommitteeName`):

```csharp
    /// <summary>
    /// True when the "set your password" invite email was sent successfully.
    /// False means the user exists but the admin should trigger a resend
    /// (e.g. via forgot-password).
    /// </summary>
    public bool EmailSent { get; set; }
```

Remove the `Password` property block from `CreateUserDto` (delete these lines):

```csharp
    [Required]
    public string Password { get; set; } = string.Empty;
```

- [ ] **Step 5: Update UsersService ctor + CreateAsync**

In `src/backend/Marsipan.Membership.Middleware/Services/UsersService.cs`:

Add usings at the top:

```csharp
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.Extensions.Logging;
```

Add fields and update the constructor:

```csharp
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationContext _db;
    private readonly IAccountEmailService _accountEmail;
    private readonly ILogger<UsersService> _logger;

    public UsersService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationContext db,
        IAccountEmailService accountEmail,
        ILogger<UsersService> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _db = db;
        _accountEmail = accountEmail;
        _logger = logger;
    }
```

Replace the create-and-role section of `CreateAsync` (the `var createResult = await _userManager.CreateAsync(user, dto.Password);` line through the `return new UserDto { ... };` at the end) with:

```csharp
        // No admin-chosen password: create with a random unusable one, then
        // invite the user to set their own via an emailed reset-token link.
        var throwaway = Guid.NewGuid().ToString("N") + "Aa1!";
        var createResult = await _userManager.CreateAsync(user, throwaway);
        if (!createResult.Succeeded)
        {
            if (createResult.Errors.Any(e =>
                    string.Equals(e.Code, "DuplicateEmail", StringComparison.Ordinal) ||
                    string.Equals(e.Code, "DuplicateUserName", StringComparison.Ordinal)))
            {
                throw new UserConflictException($"A user with email '{dto.Email}' already exists.");
            }

            throw new UserValidationException(
                string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        var roleResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            throw new UserValidationException(
                string.Join("; ", roleResult.Errors.Select(e => e.Description)));
        }

        // Generate the set-password token and email the invite. Email failure
        // must NOT roll back the user — surface it via UserDto.EmailSent.
        var emailSent = false;
        try
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            await _accountEmail.SendSetPasswordAsync(user.Email!, token);
            emailSent = true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to send set-password email to {Email}; user was still created.",
                user.Email);
        }

        string? orgUnitName = null;
        if (user.CommitteeId is int ouId)
        {
            orgUnitName = await _db.Committees
                .Where(o => o.Id == ouId)
                .Select(o => o.Name)
                .FirstOrDefaultAsync(ct);
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = dto.Role,
            CommitteeId = user.CommitteeId,
            CommitteeName = orgUnitName,
            EmailSent = emailSent,
        };
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter UsersServiceCreateTests`
Expected: PASS (2 tests).

- [ ] **Step 7: Build the whole solution to catch break from the removed `Password` field**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded. (If `DevController.cs` or anywhere references `CreateUserDto.Password`, fix those references — search `grep -rn "\.Password" src/backend/Marsipan.Membership.Web/Controllers` and remove create-user password usage.)

- [ ] **Step 8: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/UserDtos.cs \
        src/backend/Marsipan.Membership.Middleware/Services/UsersService.cs \
        src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj \
        src/backend/Marsipan.Membership.Tests/Services/UsersServiceCreateTests.cs
git commit -m "feat: email set-password invite on user creation, drop admin password"
```

---

### Task 6: Forgot / reset password endpoints

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/AuthDtos.cs` (add request DTOs)
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/IAuthService.cs` (add two methods)
- Modify: `src/backend/Marsipan.Membership.Middleware/Services/AuthService.cs` (implement; inject `IAccountEmailService`)
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/AuthController.cs` (two endpoints)
- Test: `src/backend/Marsipan.Membership.Tests/Services/AuthServiceResetTests.cs`

**Interfaces:**
- Consumes: `IAccountEmailService.SendResetPasswordAsync`; `UserManager.GeneratePasswordResetTokenAsync` / `ResetPasswordAsync`.
- Produces:
  - `ForgotPasswordRequestDto { [Required, EmailAddress] string Email }`.
  - `ResetPasswordRequestDto { [Required, EmailAddress] string Email; [Required] string Token; [Required] string NewPassword }`.
  - `IAuthService.SendPasswordResetAsync(string email)` → `Task` (always succeeds; no-op if user missing).
  - `IAuthService.ResetPasswordAsync(string email, string token, string newPassword)` → `Task<(bool ok, string? error)>`.
  - `AuthController`: `POST /api/auth/forgot-password` (always 200), `POST /api/auth/reset-password` (200 / 400).

- [ ] **Step 1: Write the failing test**

`src/backend/Marsipan.Membership.Tests/Services/AuthServiceResetTests.cs`:

```csharp
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class RecordingReset : IAccountEmailService
{
    public int ResetCalls { get; private set; }
    public Task SendSetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
        => Task.CompletedTask;
    public Task SendResetPasswordAsync(string toEmail, string resetToken, CancellationToken ct = default)
    { ResetCalls++; return Task.CompletedTask; }
}

public class AuthServiceResetTests
{
    private static ApplicationContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<ApplicationContext>().UseInMemoryDatabase(name).Options);

    private static UserManager<ApplicationUser> BuildUserManager(ApplicationContext db)
    {
        var store = new UserStore<ApplicationUser>(db);
        var idOptions = Options.Create(new IdentityOptions());
        var manager = new UserManager<ApplicationUser>(
            store, idOptions, new PasswordHasher<ApplicationUser>(),
            new IUserValidator<ApplicationUser>[] { new UserValidator<ApplicationUser>() },
            new IPasswordValidator<ApplicationUser>[] { new PasswordValidator<ApplicationUser>() },
            new UpperInvariantLookupNormalizer(),
            new IdentityErrorDescriber(), null!,
            NullLogger<UserManager<ApplicationUser>>.Instance);
        // Register the default token provider so reset tokens can be generated.
        manager.RegisterTokenProvider(
            TokenOptions.DefaultProvider,
            new DataProtectorTokenProvider<ApplicationUser>(
                new Microsoft.AspNetCore.DataProtection.EphemeralDataProtectionProvider(),
                Options.Create(new DataProtectionTokenProviderOptions()),
                NullLogger<DataProtectorTokenProvider<ApplicationUser>>.Instance));
        idOptions.Value.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultProvider;
        return manager;
    }

    private static AuthService BuildAuth(ApplicationContext db, UserManager<ApplicationUser> um, RecordingReset email)
        => new(um, null!, Options.Create(new JwtOptions { SecretKey = "x" }), email);

    [Fact]
    public async Task SendPasswordResetAsync_UnknownEmail_DoesNotThrow_AndSendsNothing()
    {
        await using var db = NewDb(nameof(SendPasswordResetAsync_UnknownEmail_DoesNotThrow_AndSendsNothing));
        var um = BuildUserManager(db);
        var email = new RecordingReset();
        var auth = BuildAuth(db, um, email);

        await auth.SendPasswordResetAsync("nobody@example.com");

        Assert.Equal(0, email.ResetCalls);
    }

    [Fact]
    public async Task ResetPasswordAsync_ValidToken_ChangesPassword()
    {
        await using var db = NewDb(nameof(ResetPasswordAsync_ValidToken_ChangesPassword));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "u@example.com", Email = "u@example.com" };
        await um.CreateAsync(user, "OldPass1");
        var token = await um.GeneratePasswordResetTokenAsync(user);
        var auth = BuildAuth(db, um, new RecordingReset());

        var (ok, error) = await auth.ResetPasswordAsync("u@example.com", token, "NewPass1");

        Assert.True(ok);
        Assert.Null(error);
        Assert.True(await um.CheckPasswordAsync(
            (await um.FindByEmailAsync("u@example.com"))!, "NewPass1"));
    }

    [Fact]
    public async Task ResetPasswordAsync_BadToken_ReturnsError()
    {
        await using var db = NewDb(nameof(ResetPasswordAsync_BadToken_ReturnsError));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "b@example.com", Email = "b@example.com" };
        await um.CreateAsync(user, "OldPass1");
        var auth = BuildAuth(db, um, new RecordingReset());

        var (ok, error) = await auth.ResetPasswordAsync("b@example.com", "not-a-real-token", "NewPass1");

        Assert.False(ok);
        Assert.NotNull(error);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter AuthServiceResetTests`
Expected: FAIL — `AuthService` ctor arity, `SendPasswordResetAsync`/`ResetPasswordAsync` missing.

- [ ] **Step 3: Add the request DTOs**

Append to `src/backend/Marsipan.Membership.Middleware/DTOs/AuthDtos.cs`:

```csharp
/// <summary>Request body for <c>POST /api/auth/forgot-password</c>.</summary>
public class ForgotPasswordRequestDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

/// <summary>Request body for <c>POST /api/auth/reset-password</c>.</summary>
public class ResetPasswordRequestDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    public string NewPassword { get; set; } = string.Empty;
}
```

- [ ] **Step 4: Add the interface methods**

Add to `IAuthService` in `src/backend/Marsipan.Membership.Middleware/Services/IAuthService.cs`:

```csharp
    /// <summary>
    /// Emails a password-reset link if the address matches a user. Always
    /// completes successfully (no user enumeration) — a missing user is a no-op.
    /// </summary>
    Task SendPasswordResetAsync(string email);

    /// <summary>
    /// Applies a new password using an Identity reset token. Returns
    /// <c>(true, null)</c> on success or <c>(false, error)</c> on an invalid /
    /// expired token or a password-policy failure.
    /// </summary>
    Task<(bool Ok, string? Error)> ResetPasswordAsync(string email, string token, string newPassword);
```

- [ ] **Step 5: Implement in AuthService**

In `src/backend/Marsipan.Membership.Middleware/Services/AuthService.cs`:

Add using:

```csharp
using Marsipan.Membership.Middleware.Services.Email;
```

Add field + extend the constructor (add the `IAccountEmailService accountEmail` parameter and assignment):

```csharp
    private readonly IAccountEmailService _accountEmail;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IOptions<JwtOptions> jwtOptions,
        IAccountEmailService accountEmail)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtOptions = jwtOptions.Value;
        _accountEmail = accountEmail;
    }
```

Add the two methods (anywhere in the class body, e.g. after `LoginAsync`):

```csharp
    public async Task SendPasswordResetAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
            return; // No enumeration: silently succeed.

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        await _accountEmail.SendResetPasswordAsync(user.Email!, token);
    }

    public async Task<(bool Ok, string? Error)> ResetPasswordAsync(string email, string token, string newPassword)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
            return (false, "Invalid or expired reset link.");

        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (result.Succeeded)
            return (true, null);

        return (false, string.Join("; ", result.Errors.Select(e => e.Description)));
    }
```

- [ ] **Step 6: Run the AuthService tests to verify they pass**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj --filter AuthServiceResetTests`
Expected: PASS (3 tests).

- [ ] **Step 7: Add the controller endpoints**

In `src/backend/Marsipan.Membership.Web/Controllers/AuthController.cs`, add after the `Logout` action:

```csharp
    /// <summary>
    /// Request a password-reset link. Always returns 200 to avoid revealing
    /// whether an account exists.
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
    {
        if (ModelState.IsValid)
            await _authService.SendPasswordResetAsync(request.Email);

        // Neutral response regardless of validity/existence.
        return Ok();
    }

    /// <summary>
    /// Set a new password using an emailed reset token.
    /// </summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var (ok, error) = await _authService.ResetPasswordAsync(
            request.Email, request.Token, request.NewPassword);
        if (!ok)
            return BadRequest(new { error });

        return Ok();
    }
```

- [ ] **Step 8: Build the solution**

Run: `dotnet build src/backend/Marsipan.Membership.sln`
Expected: Build succeeded.

- [ ] **Step 9: Run the full backend test suite**

Run: `dotnet test src/backend/Marsipan.Membership.Tests/Marsipan.Membership.Tests.csproj`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/backend/Marsipan.Membership.Middleware/DTOs/AuthDtos.cs \
        src/backend/Marsipan.Membership.Middleware/Services/IAuthService.cs \
        src/backend/Marsipan.Membership.Middleware/Services/AuthService.cs \
        src/backend/Marsipan.Membership.Web/Controllers/AuthController.cs \
        src/backend/Marsipan.Membership.Tests/Services/AuthServiceResetTests.cs
git commit -m "feat: add forgot-password and reset-password endpoints"
```

---

### Task 7: Frontend — forgot + reset pages, routes, login link, locales

**Files:**
- Create: `src/client/MembershipAdmin/src/pages/auth/ForgotPassword.jsx`
- Create: `src/client/MembershipAdmin/src/pages/auth/ResetPassword.jsx`
- Modify: `src/client/MembershipAdmin/src/services/router.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/login/Login.jsx` (add forgot link)
- Modify: `src/client/MembershipAdmin/src/locales/sr/auth.json`
- Modify: `src/client/MembershipAdmin/src/locales/en/auth.json`

**Interfaces:**
- Consumes: `api` default export (`src/framework/api.js`) → `api.post('/api/auth/forgot-password', { email })`, `api.post('/api/auth/reset-password', { email, token, newPassword })`.
- Produces: routes `/forgot-password` and `/reset-password` (both public, siblings of `/login`).

- [ ] **Step 1: Add locale keys (sr)**

In `src/client/MembershipAdmin/src/locales/sr/auth.json`, add these keys inside the root object (mind commas):

```json
  "forgotLink": "Заборавили сте лозинку?",
  "forgot": {
    "title": "Заборављена лозинка",
    "subtitle": "Унесите вашу имејл адресу и послаћемо вам линк за ресетовање.",
    "emailLabel": "Имејл",
    "submit": "Пошаљи линк",
    "submitting": "Слање...",
    "done": "Ако налог постоји, послали смо вам имејл са упутствима.",
    "backToLogin": "Назад на пријаву"
  },
  "reset": {
    "titleCreate": "Постављање лозинке",
    "titleReset": "Ресетовање лозинке",
    "subtitleCreate": "Изаберите лозинку за ваш налог.",
    "subtitleReset": "Унесите нову лозинку.",
    "passwordLabel": "Нова лозинка",
    "confirmLabel": "Потврдите лозинку",
    "submit": "Сачувај лозинку",
    "submitting": "Чување...",
    "success": "Лозинка је сачувана. Сада се можете пријавити.",
    "mismatch": "Лозинке се не подударају.",
    "invalidLink": "Линк није валидан или је истекао.",
    "minLength": "Лозинка мора имати најмање 8 карактера."
  }
```

- [ ] **Step 2: Add locale keys (en)**

In `src/client/MembershipAdmin/src/locales/en/auth.json`, add the mirror keys:

```json
  "forgotLink": "Forgot password?",
  "forgot": {
    "title": "Forgot password",
    "subtitle": "Enter your email and we'll send you a reset link.",
    "emailLabel": "Email",
    "submit": "Send link",
    "submitting": "Sending...",
    "done": "If an account exists, we've sent instructions by email.",
    "backToLogin": "Back to login"
  },
  "reset": {
    "titleCreate": "Set your password",
    "titleReset": "Reset password",
    "subtitleCreate": "Choose a password for your account.",
    "subtitleReset": "Enter a new password.",
    "passwordLabel": "New password",
    "confirmLabel": "Confirm password",
    "submit": "Save password",
    "submitting": "Saving...",
    "success": "Password saved. You can now sign in.",
    "mismatch": "Passwords do not match.",
    "invalidLink": "The link is invalid or has expired.",
    "minLength": "Password must be at least 8 characters."
  }
```

- [ ] **Step 3: Create ForgotPassword.jsx**

`src/client/MembershipAdmin/src/pages/auth/ForgotPassword.jsx`:

```jsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

export default function ForgotPassword() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '' },
  })
  const [done, setDone] = useState(false)

  const onSubmit = async ({ email }) => {
    try {
      await api.post('/api/auth/forgot-password', { email })
    } catch {
      // Neutral UX: always show the same confirmation.
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          {t('forgot.title')}
        </h1>
        {done ? (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{t('forgot.done')}</p>
            <Link to="/login" className="text-sm text-brand-500 hover:underline">
              {t('forgot.backToLogin')}
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{t('forgot.subtitle')}</p>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('forgot.emailLabel')}
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('email', { required: t('email.required') })}
            />
            {errors.email && <p className="mb-2 text-xs text-red-500">{errors.email.message}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
            </button>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-brand-500 hover:underline">
                {t('forgot.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ResetPassword.jsx**

`src/client/MembershipAdmin/src/pages/auth/ResetPassword.jsx`:

```jsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

export default function ResetPassword() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const email = params.get('email') || ''
  const token = params.get('token') || ''
  const mode = params.get('mode') === 'create' ? 'create' : 'reset'

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { password: '', confirm: '' },
  })
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async ({ password, confirm }) => {
    setServerError(null)
    if (password !== confirm) {
      setServerError(t('reset.mismatch'))
      return
    }
    try {
      await api.post('/api/auth/reset-password', { email, token, newPassword: password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.title || t('reset.invalidLink')
      setServerError(msg)
    }
  }

  const title = mode === 'create' ? t('reset.titleCreate') : t('reset.titleReset')
  const subtitle = mode === 'create' ? t('reset.subtitleCreate') : t('reset.subtitleReset')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {success ? (
          <p className="text-sm text-green-600">{t('reset.success')}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>

            <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('reset.passwordLabel')}
            </label>
            <input
              id="rp-password"
              type="password"
              autoComplete="new-password"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('password', {
                required: t('reset.passwordLabel'),
                minLength: { value: 8, message: t('reset.minLength') },
              })}
            />
            {errors.password && <p className="mb-2 text-xs text-red-500">{errors.password.message}</p>}

            <label htmlFor="rp-confirm" className="mb-1.5 mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('reset.confirmLabel')}
            </label>
            <input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('confirm', { required: t('reset.confirmLabel') })}
            />
            {errors.confirm && <p className="mb-2 text-xs text-red-500">{errors.confirm.message}</p>}

            {serverError && <p className="mt-3 text-sm text-red-500">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !token || !email}
              className="mt-5 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting ? t('reset.submitting') : t('reset.submit')}
            </button>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-brand-500 hover:underline">
                {t('forgot.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Register the routes**

In `src/client/MembershipAdmin/src/services/router.jsx`:

Add imports near the other page imports (after `import Login from '../pages/login/Login'`):

```jsx
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'
```

Add the two public routes immediately after `<Route path="/login" element={<Login />} />`:

```jsx
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Step 6: Add the forgot-password link on the login page**

In `src/client/MembershipAdmin/src/pages/login/Login.jsx`:

Ensure `Link` is imported from `react-router-dom` (line ~3). If the import is `import { useNavigate, useLocation } from 'react-router-dom'`, change it to include `Link`:

```jsx
import { useNavigate, useLocation, Link } from 'react-router-dom'
```

Add the link right after the password field's closing wrapper (inside `.lp-form-panel`, before the submit button). Insert:

```jsx
        <div className="lp-forgot" style={{ marginTop: 8, textAlign: 'right' }}>
          <Link to="/forgot-password">{t('forgotLink')}</Link>
        </div>
```

(Place it where it renders between the password input and the submit button; adjust the class to match Login's `lp-` scoped CSS conventions — inline style is acceptable as a fallback.)

- [ ] **Step 7: Run the frontend build to verify it compiles**

Run: `cd src/client/MembershipAdmin && npm run build`
Expected: build succeeds (Vite bundles without unresolved imports).

- [ ] **Step 8: Commit**

```bash
git add src/client/MembershipAdmin/src/pages/auth/ \
        src/client/MembershipAdmin/src/services/router.jsx \
        src/client/MembershipAdmin/src/pages/login/Login.jsx \
        src/client/MembershipAdmin/src/locales/sr/auth.json \
        src/client/MembershipAdmin/src/locales/en/auth.json
git commit -m "feat: add forgot/reset password pages, routes and login link"
```

---

### Task 8: Frontend — remove the create-user password field

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/users/Users.jsx` (CreateUserModal)

**Interfaces:**
- Consumes: `POST /api/users` (now rejects `Password`; create payload must omit it).
- Produces: create-user modal without a password input; optional toast when `emailSent === false`.

- [ ] **Step 1: Remove the password default value**

In `CreateUserModal` `useForm({ defaultValues: {...} })` (~line 308), delete the `password: '',` entry.

- [ ] **Step 2: Remove the password field JSX**

Delete the entire password `<div className="mb-4">…</div>` block (~lines 374-389, the label + input registering `'password'` + the error `<p>`).

- [ ] **Step 3: Remove password from the create payload**

In the create submit handler (~line 320), delete the line `password: values.password,`.

- [ ] **Step 4: Surface the invite-email result (optional but recommended)**

Where the create response is handled (after `await api.post('/api/users', payload)`), read the response and warn if the invite failed. Change:

```js
await api.post('/api/users', payload); await onCreated()
```

to:

```js
const res = await api.post('/api/users', payload)
if (res?.data && res.data.emailSent === false) {
  toast.error(t('users:toast.inviteEmailFailed'))
} else {
  toast.success(t('users:toast.created'))
}
await onCreated()
```

Add locale keys `users:toast.inviteEmailFailed` to both `src/client/MembershipAdmin/src/locales/sr/users.json` and `en/users.json`:
- sr: `"inviteEmailFailed": "Корисник је направљен, али слање имејла није успело."`
- en: `"inviteEmailFailed": "User created, but sending the invite email failed."`

(If `toast` is not already in scope in `CreateUserModal`, use the existing toast pattern already present in `Users.jsx` — `const toast = useToast()` at the parent and pass it down, or match however the create success is currently surfaced. If the current code shows no toast on create, keep this minimal: skip the toast and just `await onCreated()`.)

- [ ] **Step 5: Run the frontend build**

Run: `cd src/client/MembershipAdmin && npm run build`
Expected: build succeeds; no references to a removed `password` field remain.

- [ ] **Step 6: Commit**

```bash
git add src/client/MembershipAdmin/src/pages/users/Users.jsx \
        src/client/MembershipAdmin/src/locales/sr/users.json \
        src/client/MembershipAdmin/src/locales/en/users.json
git commit -m "feat: remove admin-set password from user creation form"
```

---

### Task 9: End-to-end local verification (directory delivery)

**Files:** none (manual + smoke).

- [ ] **Step 1: Start the backend**

Run: `cd src/backend/Marsipan.Membership.Web && ASPNETCORE_ENVIRONMENT=Development dotnet run --urls "http://localhost:5152;https://localhost:7231"`
Expected: "Now listening on: http://localhost:5152".

- [ ] **Step 2: Start the frontend**

Run: `cd src/client/MembershipAdmin && npm run dev`
Expected: Vite on http://localhost:5185.

- [ ] **Step 3: Trigger a forgot-password email via curl**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5152/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"admin@local.com"}'
```
Expected: `200`. Then confirm an `.eml` file appeared:
```bash
ls src/backend/Marsipan.Membership.Web/wwwroot/mail-pickup/
```
Expected: one `.eml` file. Open it; verify it contains a `http://localhost:5185/reset-password?email=...&token=...&mode=reset` link.

- [ ] **Step 4: Verify unknown email still returns 200 and writes nothing**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5152/api/auth/forgot-password \
  -H "Content-Type: application/json" -d '{"email":"nobody@nowhere.tld"}'
```
Expected: `200`, and no new `.eml` for that address.

- [ ] **Step 5: Complete the reset in the browser**

Copy the link from the `.eml`, open it in the browser (frontend running), set a new password (≥8 chars incl. a digit per Identity policy), submit. Expected: success message, redirect to `/login`; logging in with the new password succeeds.

- [ ] **Step 6: Verify invite-on-create**

Log in as SuperAdmin (`admin@local.com` / `Admin123!`), create a new user (no password field present). Expected: `.eml` with a `mode=create` link appears in the pickup dir; clicking it lets the new user set their password and log in.

- [ ] **Step 7: Final full test run**

Run: `dotnet test src/backend/Marsipan.Membership.sln`
Expected: all tests pass.

- [ ] **Step 8: Report**

Summarize what was verified (both `.eml` links, reset completion, invite completion) with the pickup-dir path. Note that this fell back to directory delivery per `Email:DeliveryMethod=Directory` and that switching to real SMTP is a config-only change.
