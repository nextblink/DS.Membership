using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
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
        // Match the app's real password policy (Program.cs) so plain
        // alphanumeric test passwords like "OldPass1" validate.
        idOptions.Value.Password.RequireNonAlphanumeric = false;
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

    private static AuthService BuildAuth(ApplicationContext db, UserManager<ApplicationUser> um, IAccountEmailService email)
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

        var (ok, error, failure) = await auth.ResetPasswordAsync("u@example.com", token, "NewPass1");

        Assert.True(ok, error);
        Assert.Null(error);
        Assert.Equal(ResetPasswordFailure.None, failure);
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

        var (ok, error, failure) = await auth.ResetPasswordAsync("b@example.com", "not-a-real-token", "NewPass1");

        Assert.False(ok);
        Assert.NotNull(error);
        Assert.Equal(ResetPasswordFailure.InvalidLink, failure);
    }

    [Fact]
    public async Task ResetPasswordAsync_TokenIsSingleUse_SecondUseRejectedAndPasswordUnchanged()
    {
        // Covers the invite ("set your password") link as well as forgot-password:
        // both hand out the same Identity password-reset token. A successful reset
        // rotates the user's security stamp, which must invalidate the emailed link
        // so it cannot be replayed to take over the account later.
        await using var db = NewDb(nameof(ResetPasswordAsync_TokenIsSingleUse_SecondUseRejectedAndPasswordUnchanged));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "invitee@example.com", Email = "invitee@example.com" };
        await um.CreateAsync(user, "Throwaway1");
        var inviteToken = await um.GeneratePasswordResetTokenAsync(user);
        var auth = BuildAuth(db, um, new RecordingReset());

        var (firstOk, firstError, _) = await auth.ResetPasswordAsync("invitee@example.com", inviteToken, "ChosenPass1");
        var (secondOk, secondError, secondFailure) = await auth.ResetPasswordAsync("invitee@example.com", inviteToken, "Hijacked1");

        Assert.True(firstOk, firstError);
        Assert.False(secondOk);
        Assert.NotNull(secondError);
        Assert.Equal(ResetPasswordFailure.InvalidLink, secondFailure);

        var stored = (await um.FindByEmailAsync("invitee@example.com"))!;
        Assert.True(await um.CheckPasswordAsync(stored, "ChosenPass1"));
        Assert.False(await um.CheckPasswordAsync(stored, "Hijacked1"));
    }

    [Fact]
    public async Task ResetPasswordAsync_WeakPassword_ReportsPasswordPolicy_NotInvalidLink()
    {
        // A valid link plus a bad password must NOT look like a dead link — the
        // SPA keeps the form up for this case so the user can pick another one.
        await using var db = NewDb(nameof(ResetPasswordAsync_WeakPassword_ReportsPasswordPolicy_NotInvalidLink));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "w@example.com", Email = "w@example.com" };
        await um.CreateAsync(user, "OldPass1");
        var token = await um.GeneratePasswordResetTokenAsync(user);
        var auth = BuildAuth(db, um, new RecordingReset());

        // Too short and no digit — violates the app's policy, token is fine.
        var (ok, error, failure) = await auth.ResetPasswordAsync("w@example.com", token, "short");

        Assert.False(ok);
        Assert.NotNull(error);
        Assert.Equal(ResetPasswordFailure.PasswordPolicy, failure);
    }

    [Fact]
    public async Task ResetPasswordAsync_UnknownEmailAndBadTokenForExistingUser_ReturnSameError()
    {
        await using var db = NewDb(nameof(ResetPasswordAsync_UnknownEmailAndBadTokenForExistingUser_ReturnSameError));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "c@example.com", Email = "c@example.com" };
        await um.CreateAsync(user, "OldPass1");
        var auth = BuildAuth(db, um, new RecordingReset());

        var (unknownOk, unknownError, unknownFailure) = await auth.ResetPasswordAsync("nobody@example.com", "whatever-token", "NewPass1");
        var (badTokenOk, badTokenError, badTokenFailure) = await auth.ResetPasswordAsync("c@example.com", "not-a-real-token", "NewPass1");

        Assert.False(unknownOk);
        Assert.False(badTokenOk);
        Assert.Equal(unknownError, badTokenError);
        Assert.Equal(unknownFailure, badTokenFailure);
        Assert.Equal(ResetPasswordFailure.InvalidLink, unknownFailure);
    }
}
