using Marsipan.Membership.Middleware.Data;
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

public class ScopeFiltersCallContactTests
{
    private static ApplicationContext NewDb(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationContext(options);
    }

    private static async Task SeedAsync(ApplicationContext db)
    {
        var campaign = new Campaign { Name = "C1", CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        var pool = new CallPool { Name = "P1", CampaignId = campaign.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.CallPools.Add(pool);
        await db.SaveChangesAsync();

        db.CallPoolOperators.Add(new CallPoolOperator
        {
            CallPoolId = pool.Id, UserId = "operator-1",
            CreatedByUserId = "seed", LastModifiedByUserId = "seed"
        });

        db.CallContacts.AddRange(
            new CallContact
            {
                FirstName = "In", LastName = "Pool", PhoneNumber = "1",
                CampaignId = campaign.Id, PoolId = pool.Id,
                CreatedByUserId = "seed", LastModifiedByUserId = "seed"
            },
            new CallContact
            {
                FirstName = "No", LastName = "Pool", PhoneNumber = "2",
                CampaignId = campaign.Id, PoolId = null,
                CreatedByUserId = "seed", LastModifiedByUserId = "seed"
            });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Unauthenticated_ReturnsEmpty()
    {
        await using var db = NewDb(nameof(Unauthenticated_ReturnsEmpty));
        await SeedAsync(db);
        var user = new FakeUser { IsAuthenticated = false };

        var result = db.CallContacts.ApplyCallContactScope(user).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public async Task Admin_SeesAllContacts()
    {
        await using var db = NewDb(nameof(Admin_SeesAllContacts));
        await SeedAsync(db);
        var user = new FakeUser { Id = "admin-1", Role = ScopeFilters.RoleAdmin };

        var result = db.CallContacts.ApplyCallContactScope(user).ToList();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task Operator_SeesOnlyAssignedPoolContacts()
    {
        await using var db = NewDb(nameof(Operator_SeesOnlyAssignedPoolContacts));
        await SeedAsync(db);
        var user = new FakeUser { Id = "operator-1", Role = ScopeFilters.RoleOperator };

        var result = db.CallContacts.ApplyCallContactScope(user).ToList();

        var contact = Assert.Single(result);
        Assert.Equal("In", contact.FirstName);
    }

    [Fact]
    public async Task Operator_NotAssignedToAnyPool_SeesNothing()
    {
        await using var db = NewDb(nameof(Operator_NotAssignedToAnyPool_SeesNothing));
        await SeedAsync(db);
        var user = new FakeUser { Id = "operator-2", Role = ScopeFilters.RoleOperator };

        var result = db.CallContacts.ApplyCallContactScope(user).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public async Task RestrictedNonOperatorRole_SeesNothing()
    {
        await using var db = NewDb(nameof(RestrictedNonOperatorRole_SeesNothing));
        await SeedAsync(db);
        var user = new FakeUser { Id = "viewer-1", Role = ScopeFilters.RoleViewer, CommitteeId = 1 };

        var result = db.CallContacts.ApplyCallContactScope(user).ToList();

        Assert.Empty(result);
    }
}
