# Email + account flows (invite / password reset) — design

**Date:** 2026-07-25
**Status:** Approved, pending implementation

## Problem

The app has no email capability. Admin-created users get a plaintext password
chosen by the caller (`CreateUserDto.Password`), and there is no
forgot/reset-password flow at all. We need:

1. Transactional email sending, with a **directory-delivery fallback** for local
   dev (write `.eml` files to disk instead of talking to a real SMTP server).
2. User creation to email a **"set your password"** link instead of the admin
   choosing the password.
3. A self-service **forgot-password** flow for existing (locked-out) users,
   entered from the login page.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Creation flow | Admin creates user **without** a password; system emails a set-password link. `CreateUserDto.Password` removed/ignored. |
| Reset entry point | Public "Zaboravili ste lozinku?" link on the login page → public `forgot-password` / `reset-password` endpoints. |
| Email library | **MailKit** for real SMTP; custom `DirectoryEmailSender` for the disk fallback (System.Net.Mail.SmtpClient is obsolete). |
| Delivery selection | `Email:DeliveryMethod` config = `Smtp` \| `Directory`. Dev default `Directory`. |
| Link target | `EmailOptions.FrontendBaseUrl` (dev `http://localhost:5185`); links point at the SPA. |
| UI reuse | **One** shared `/reset-password` React page, `mode=create\|reset` switches copy. |
| Email format | Simple HTML template, **Serbian only**. |
| Create + email failure | **Keep the user**, return success with a warning; do not roll back. |

## Architecture

New folder `Marsipan.Membership.Middleware/Services/Email/`:

- **`IEmailSender`** — `Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)`
- **`SmtpEmailSender`** (MailKit `SmtpClient`) — used when `DeliveryMethod = Smtp`.
- **`DirectoryEmailSender`** — writes each message as a timestamped `.eml`
  (RFC 822, via MailKit `MimeMessage.WriteTo`) into `EmailOptions.PickupDirectory`.
  Creates the directory if missing.
- **`EmailOptions`** (in `Options/`, matching `JwtOptions`/`AnthropicOptions`
  POCO convention):
  - `DeliveryMethod` (`"Directory"` default), `PickupDirectory`
  - `SmtpHost`, `SmtpPort`, `SmtpUser`, `SmtpPassword`, `SmtpUseStartTls`
  - `FromAddress`, `FromName`
  - `FrontendBaseUrl`
- **`IAccountEmailService` / `AccountEmailService`** — builds the two HTML bodies
  (set-password, reset-password), constructs the link
  `{FrontendBaseUrl}/reset-password?email={enc}&token={enc}&mode={create|reset}`,
  and calls `IEmailSender`. Both link kinds use the **same Identity
  password-reset token**.

### DI (`Program.cs`, new `// --- Email ---` block)

- `builder.Services.Configure<EmailOptions>(config.GetSection("Email"))`
- Register `IEmailSender` via a factory that reads `DeliveryMethod` and returns
  `SmtpEmailSender` or `DirectoryEmailSender`.
- `AddScoped<IAccountEmailService, AccountEmailService>()`.
- Add MailKit `PackageReference` to the Middleware `.csproj`.

## Backend flow changes

### User creation — `UsersService.CreateAsync`
- Create `ApplicationUser` with **no** password (`CreateAsync(user)` without a
  password, or a random unusable one). Assign role as today (keep existing
  rollback-on-role-failure).
- `token = await _userManager.GeneratePasswordResetTokenAsync(user)`.
- `await _accountEmailService.SendSetPasswordAsync(user, token)` (`mode=create`).
- If the email throws: log it, **keep the user**, surface a warning to the
  controller so it can return `201` with `{ emailSent: false }` (admin can use
  forgot-password to retry).
- `CreateUserDto.Password` is removed (or kept optional and ignored). Update the
  create endpoint/validation accordingly.

### Forgot / reset — `AuthController` (both `[AllowAnonymous]`)
- `POST /api/auth/forgot-password` `{ email }` → **always 200** (no user
  enumeration). If the user exists, generate a reset token and email a
  `mode=reset` link.
- `POST /api/auth/reset-password` `{ email, token, newPassword }` →
  `ResetPasswordAsync`; `200` on success, `400` on invalid/expired token or
  password-policy failure (return the Identity errors).

Corresponding methods added to `IAuthService`/`AuthService`.

## Frontend changes (`MembershipAdmin`)

- New **public** route `/reset-password` (outside `PrivateRoute`) → shared page.
  Reads `email`, `token`, `mode` from the query string. Form: new password +
  confirm; `POST /api/auth/reset-password`. Heading/copy switch on `mode`
  ("Postavite lozinku" vs "Resetujte lozinku"). On success → redirect to login
  with a toast.
- New **public** route `/forgot-password` → email input; `POST
  /api/auth/forgot-password`; always shows a neutral "Ako nalog postoji, poslali
  smo vam email" confirmation.
- **"Zaboravili ste lozinku?"** link on the login page → `/forgot-password`.
- **Remove the password field** from the user-create form; adjust the create
  API call and any validation.
- Serbian strings added to the relevant `src/locales/*` files (auth/users).

## Config

`appsettings.Development.json` gains:

```json
"Email": {
  "DeliveryMethod": "Directory",
  "PickupDirectory": "wwwroot/mail-pickup",
  "FromAddress": "no-reply@marcipano.local",
  "FromName": "Marcipano",
  "FrontendBaseUrl": "http://localhost:5185"
}
```

`appsettings.json` gains the same section with empty SMTP fields and
`DeliveryMethod` left for the environment to override (production sets `Smtp`
+ host/credentials via user-secrets/env/KeyVault — never commit real creds).
`wwwroot/mail-pickup/` added to `.gitignore`.

## Testing (local)

- **Manual:** create a user or hit forgot-password → a `.eml` appears in
  `wwwroot/mail-pickup/`; open it, click the link, land on `/reset-password`,
  set a password, log in.
- **Unit tests** (`Marsipan.Membership.Tests`):
  - `DirectoryEmailSender` writes a well-formed `.eml` to the target dir.
  - `AccountEmailService` builds the correct link URL (base + encoded
    email/token + mode).
  - `reset-password` endpoint: valid token → 200 & password changed; bad/expired
    token → 400.
  - `forgot-password`: unknown email still returns 200 and sends nothing.

## Out of scope (YAGNI)

- Real production SMTP provider selection/tuning (config supports it; no provider
  wired).
- Email localization/i18n (Serbian only for now).
- A dedicated "resend invite" admin action (admin uses forgot-password to retry).
- Email verification / confirm-email flows.
