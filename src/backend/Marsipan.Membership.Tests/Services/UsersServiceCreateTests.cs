using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Marsipan.Membership.Middleware.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

internal sealed class RecordingAccountEmail : IAccountEmailService
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
