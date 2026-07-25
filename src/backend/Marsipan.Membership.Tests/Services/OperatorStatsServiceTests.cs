using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Marsipan.Membership.Tests.Services;

file sealed class StatsUser : ICurrentUserContext
{
    public string? Id { get; init; }
    public string? Role { get; init; }
    public int? CommitteeId { get; init; }
    public bool IsAuthenticated { get; init; } = true;
}

public class OperatorStatsServiceTests
{
    private const string Me = "operator-me";
    private const string Other = "operator-other";

    private static ApplicationContext NewDb(string name) =>
        new(new DbContextOptionsBuilder<ApplicationContext>().UseInMemoryDatabase(name).Options);

    private static OperatorStatsService BuildService(ApplicationContext db, string userId = Me) =>
        new(db, new StatsUser { Id = userId, Role = ScopeFilters.RoleOperator });

    // Creates a pool the given operator is assigned to, plus a contact in it.
    // NOTE: CallPool, CallPoolOperator and CallContact all derive from
    // BaseEntity, whose CreatedByUserId / LastModifiedByUserId are
    // non-nullable — the InMemory provider rejects SaveChanges if they are
    // left unset, so every seeded row sets them.
    private static async Task<CallContact> SeedPooledContactAsync(
        ApplicationContext db, string operatorUserId, string firstName,
        ContactFinalStatus? finalStatus = null)
    {
        var campaign = new Campaign
        {
            Name = "Camp-" + firstName,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        var pool = new CallPool
        {
            Name = "P-" + firstName,
            CampaignId = campaign.Id,   // [Required] on CallPool
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.CallPools.Add(pool);
        await db.SaveChangesAsync();

        db.CallPoolOperators.Add(new CallPoolOperator
        {
            CallPoolId = pool.Id,
            UserId = operatorUserId,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        });

        var contact = new CallContact
        {
            FirstName = firstName,
            LastName = "Test",
            PhoneNumber = "060" + firstName,
            PoolId = pool.Id,
            FinalStatus = finalStatus,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed",
        };
        db.CallContacts.Add(contact);
        await db.SaveChangesAsync();
        return contact;
    }

    private static void AddAttempt(
        ApplicationContext db, int contactId, string userId, CallOutcome outcome, DateTime calledAt)
    {
        db.CallAttempts.Add(new CallAttempt
        {
            CallContactId = contactId,
            CalledByUserId = userId,
            Outcome = outcome,
            CalledAt = calledAt,
            // BaseEntity audit fields are non-nullable — must be set.
            CreatedByUserId = userId,
            LastModifiedByUserId = userId,
        });
    }

    [Fact]
    public async Task GetMyStatsAsync_CountsOnlyMyAttempts_AcrossTimeWindows()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_CountsOnlyMyAttempts_AcrossTimeWindows));
        var contact = await SeedPooledContactAsync(db, Me, "A");
        var now = DateTime.UtcNow;

        AddAttempt(db, contact.Id, Me, CallOutcome.ValidContact, now.AddMinutes(-5));   // today
        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now.AddDays(-3));          // last 7 days
        AddAttempt(db, contact.Id, Me, CallOutcome.Refused, now.AddDays(-10));          // total only
        AddAttempt(db, contact.Id, Other, CallOutcome.ValidContact, now.AddMinutes(-5)); // someone else
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(1, stats.CallsToday);
        Assert.Equal(2, stats.CallsLast7Days);
        Assert.Equal(3, stats.CallsTotal);
    }

    [Fact]
    public async Task GetMyStatsAsync_OutcomeBreakdown_GroupsMyAttemptsOnly()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_OutcomeBreakdown_GroupsMyAttemptsOnly));
        var contact = await SeedPooledContactAsync(db, Me, "B");
        var now = DateTime.UtcNow;

        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now);
        AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now);
        AddAttempt(db, contact.Id, Me, CallOutcome.ValidContact, now);
        AddAttempt(db, contact.Id, Other, CallOutcome.Refused, now);
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(2, stats.OutcomeBreakdown.Single(o => o.Outcome == CallOutcome.NoAnswer).Count);
        Assert.Equal(1, stats.OutcomeBreakdown.Single(o => o.Outcome == CallOutcome.ValidContact).Count);
        Assert.DoesNotContain(stats.OutcomeBreakdown, o => o.Outcome == CallOutcome.Refused);
    }

    [Fact]
    public async Task GetMyStatsAsync_QueueProgress_HonoursPoolScope()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_QueueProgress_HonoursPoolScope));
        await SeedPooledContactAsync(db, Me, "C1");                                       // mine, unresolved
        await SeedPooledContactAsync(db, Me, "C2", ContactFinalStatus.ActiveMember);       // mine, resolved
        await SeedPooledContactAsync(db, Other, "C3");                                     // not my pool
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(2, stats.QueueTotal);
        Assert.Equal(1, stats.QueueResolved);
    }

    [Fact]
    public async Task GetMyStatsAsync_RecentCalls_NewestFirst_CappedAtTen_AndMineOnly()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_RecentCalls_NewestFirst_CappedAtTen_AndMineOnly));
        var contact = await SeedPooledContactAsync(db, Me, "D");
        var now = DateTime.UtcNow;

        // 12 of mine, oldest first, so the newest has the smallest offset.
        for (var i = 12; i >= 1; i--)
            AddAttempt(db, contact.Id, Me, CallOutcome.NoAnswer, now.AddMinutes(-i));
        AddAttempt(db, contact.Id, Other, CallOutcome.ValidContact, now);
        await db.SaveChangesAsync();

        var stats = await BuildService(db).GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(10, stats.RecentCalls.Count);
        Assert.All(stats.RecentCalls, r => Assert.Equal(CallOutcome.NoAnswer, r.Outcome));
        Assert.True(stats.RecentCalls[0].CalledAt >= stats.RecentCalls[1].CalledAt);
        Assert.Equal("D Test", stats.RecentCalls[0].ContactName);
        Assert.Equal("060D", stats.RecentCalls[0].PhoneNumber);
        Assert.Equal(contact.Id, stats.RecentCalls[0].CallContactId);
    }

    [Fact]
    public async Task GetMyStatsAsync_NoUserId_ReturnsEmptyStats()
    {
        await using var db = NewDb(nameof(GetMyStatsAsync_NoUserId_ReturnsEmptyStats));
        var contact = await SeedPooledContactAsync(db, Me, "E");
        AddAttempt(db, contact.Id, Me, CallOutcome.ValidContact, DateTime.UtcNow);
        await db.SaveChangesAsync();

        var service = new OperatorStatsService(
            db, new StatsUser { Id = null, Role = ScopeFilters.RoleOperator, IsAuthenticated = false });

        var stats = await service.GetMyStatsAsync(CancellationToken.None);

        Assert.Equal(0, stats.CallsTotal);
        Assert.Equal(0, stats.CallsToday);
        Assert.Equal(0, stats.CallsLast7Days);
        Assert.Equal(0, stats.QueueTotal);
        Assert.Equal(0, stats.QueueResolved);
        Assert.Empty(stats.OutcomeBreakdown);
        Assert.Empty(stats.RecentCalls);
    }
}
