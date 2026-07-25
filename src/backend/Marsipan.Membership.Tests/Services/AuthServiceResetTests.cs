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

        var (ok, error) = await auth.ResetPasswordAsync("u@example.com", token, "NewPass1");

        Assert.True(ok, error);
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

    [Fact]
    public async Task ResetPasswordAsync_UnknownEmailAndBadTokenForExistingUser_ReturnSameError()
    {
        await using var db = NewDb(nameof(ResetPasswordAsync_UnknownEmailAndBadTokenForExistingUser_ReturnSameError));
        var um = BuildUserManager(db);
        var user = new ApplicationUser { UserName = "c@example.com", Email = "c@example.com" };
        await um.CreateAsync(user, "OldPass1");
        var auth = BuildAuth(db, um, new RecordingReset());

        var (unknownOk, unknownError) = await auth.ResetPasswordAsync("nobody@example.com", "whatever-token", "NewPass1");
        var (badTokenOk, badTokenError) = await auth.ResetPasswordAsync("c@example.com", "not-a-real-token", "NewPass1");

        Assert.False(unknownOk);
        Assert.False(badTokenOk);
        Assert.Equal(unknownError, badTokenError);
    }
}
