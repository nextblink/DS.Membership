using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class FakeUser : ICurrentUserContext
{
    public string? Id { get; init; }
    public string? Role { get; init; }
    public int? CommitteeId { get; init; }
    public bool IsAuthenticated { get; init; } = true;
}

file sealed class NoopImportService : ICallContactImportService
{
    public Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
        => throw new NotImplementedException();
}

/// <summary>
/// Covers the claim-race fix for #80.
///
/// EF Core's InMemory provider (used throughout this test project) never auto-generates
/// the SQL Server `rowversion` value the way a real database engine does, so a purely
/// sequential two-calls-in-a-row test can't organically reproduce the original race (both
/// calls would just see the ordinary "already claimed" business-rule branch, which existed
/// before #80 too). <see cref="RowVersionMismatch_CausesSaveChangesToThrowConcurrencyException"/>
/// instead directly proves the mechanism the fix relies on: a stale RowVersion causes
/// SaveChangesAsync to reject a concurrent write instead of silently overwriting it. The
/// remaining tests cover ClaimAsync/GetNextForOperatorAsync's ordinary (sequential) claim
/// bookkeeping, which the rework must not regress.
/// </summary>
public class CallContactServiceClaimTests
{
    private static ApplicationContext NewDb(DbContextOptions<ApplicationContext> options) => new(options);

    private static DbContextOptions<ApplicationContext> NewOptions(string name) =>
        new DbContextOptionsBuilder<ApplicationContext>().UseInMemoryDatabase(name).Options;

    private static async Task<(DbContextOptions<ApplicationContext> options, int contactId)> SeedUnclaimedAsync(string dbName)
    {
        var options = NewOptions(dbName);
        await using var db = NewDb(options);
        var campaign = new Campaign { Name = "C1", CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        var contact = new CallContact
        {
            FirstName = "Ana",
            LastName = "Anic",
            PhoneNumber = "0601234567",
            CampaignId = campaign.Id,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed"
        };
        db.CallContacts.Add(contact);
        await db.SaveChangesAsync();

        return (options, contact.Id);
    }

    private static CallContactService BuildService(ApplicationContext db, string userId) =>
        new(db, new FakeUser { Id = userId, Role = ScopeFilters.RoleAdmin }, new NoopImportService());

    [Fact]
    public async Task RowVersionMismatch_CausesSaveChangesToThrowConcurrencyException()
    {
        // Proves the concurrency token the fix relies on actually works: if the stored
        // RowVersion changes underneath a tracked entity (exactly what SQL Server's
        // `rowversion` column does on every concurrent UPDATE in production), a later save
        // against the stale copy must fail instead of silently overwriting.
        var (options, contactId) = await SeedUnclaimedAsync(nameof(RowVersionMismatch_CausesSaveChangesToThrowConcurrencyException));

        await using var readerA = NewDb(options);
        var contactA = await readerA.CallContacts.FirstAsync(c => c.Id == contactId);

        // Simulate a concurrent writer (operator B / SQL Server) changing the row — and its
        // RowVersion — after A's read.
        await using var writerB = NewDb(options);
        var contactB = await writerB.CallContacts.FirstAsync(c => c.Id == contactId);
        contactB.ClaimedByUserId = "operator-b";
        contactB.ClaimedAt = DateTime.UtcNow;
        contactB.RowVersion = Guid.NewGuid().ToByteArray();
        await writerB.SaveChangesAsync();

        // A still holds the pre-B RowVersion in its OriginalValues, so its write must be
        // rejected rather than clobbering B's claim.
        contactA.ClaimedByUserId = "operator-a";
        contactA.ClaimedAt = DateTime.UtcNow;
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => readerA.SaveChangesAsync());
    }

    [Fact]
    public async Task ClaimAsync_ContactAlreadyClaimedByAnotherOperator_ThrowsAlreadyClaimed()
    {
        var (options, contactId) = await SeedUnclaimedAsync(nameof(ClaimAsync_ContactAlreadyClaimedByAnotherOperator_ThrowsAlreadyClaimed));

        await using var dbA = NewDb(options);
        var claimed = await BuildService(dbA, "operator-a").ClaimAsync(contactId);
        Assert.NotNull(claimed);

        await using var dbB = NewDb(options);
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => BuildService(dbB, "operator-b").ClaimAsync(contactId));
        Assert.Equal("already_claimed", ex.Message);
    }

    [Fact]
    public async Task ClaimAsync_SameOperatorReClaiming_Succeeds()
    {
        var (options, contactId) = await SeedUnclaimedAsync(nameof(ClaimAsync_SameOperatorReClaiming_Succeeds));

        await using var db = NewDb(options);
        var service = BuildService(db, "operator-a");

        await service.ClaimAsync(contactId);
        var again = await service.ClaimAsync(contactId);

        Assert.NotNull(again);
        var final = await db.CallContacts.FindAsync(contactId);
        Assert.Equal("operator-a", final!.ClaimedByUserId);
    }

    [Fact]
    public async Task GetNextForOperatorAsync_ContactAlreadyClaimedByAnother_IsNotOfferedAgain()
    {
        var (options, contactId) = await SeedUnclaimedAsync(nameof(GetNextForOperatorAsync_ContactAlreadyClaimedByAnother_IsNotOfferedAgain));

        await using var dbA = NewDb(options);
        var first = await BuildService(dbA, "operator-a").GetNextForOperatorAsync();
        Assert.NotNull(first);
        Assert.Equal(contactId, first!.Id);

        // Only one contact exists and it's now claimed by A — B must not be handed it too.
        await using var dbB = NewDb(options);
        var second = await BuildService(dbB, "operator-b").GetNextForOperatorAsync();
        Assert.Null(second);
    }
}
