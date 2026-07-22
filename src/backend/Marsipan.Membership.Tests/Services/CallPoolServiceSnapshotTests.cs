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

public class CallPoolServiceSnapshotTests
{
    private static ApplicationContext NewDb(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationContext(options);
    }

    private static CallPoolService BuildService(ApplicationContext db) =>
        new(db, new FakeUser { Id = "admin-1", Role = ScopeFilters.RoleAdmin });

    private static async Task<Campaign> SeedCampaignWithContactsAsync(ApplicationContext db, string city, int count)
    {
        var campaign = new Campaign { Name = "C1", CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        for (var i = 0; i < count; i++)
        {
            db.CallContacts.Add(new CallContact
            {
                FirstName = $"F{i}",
                LastName = "L",
                PhoneNumber = $"060{i}",
                City = city,
                CampaignId = campaign.Id,
                CreatedByUserId = "seed",
                LastModifiedByUserId = "seed"
            });
        }
        await db.SaveChangesAsync();
        return campaign;
    }

    [Fact]
    public async Task CreateAsync_StampsOnlyCurrentlyUnpooledMatchingContacts()
    {
        await using var db = NewDb(nameof(CreateAsync_StampsOnlyCurrentlyUnpooledMatchingContacts));
        var campaign = await SeedCampaignWithContactsAsync(db, "Belgrade", 3);
        // Add a non-matching contact (different city) and one already stamped to another pool.
        db.CallContacts.Add(new CallContact
        {
            FirstName = "Other", LastName = "City", PhoneNumber = "0700",
            City = "NoviSad", CampaignId = campaign.Id,
            CreatedByUserId = "seed", LastModifiedByUserId = "seed"
        });
        var otherPool = new CallPool { Name = "Existing", CampaignId = campaign.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.CallPools.Add(otherPool);
        await db.SaveChangesAsync();
        db.CallContacts.Add(new CallContact
        {
            FirstName = "Already", LastName = "Pooled", PhoneNumber = "0701",
            City = "Belgrade", CampaignId = campaign.Id, PoolId = otherPool.Id,
            CreatedByUserId = "seed", LastModifiedByUserId = "seed"
        });
        await db.SaveChangesAsync();

        var service = BuildService(db);
        var pool = await service.CreateAsync(new CreateCallPoolRequest("Pool 1", campaign.Id, "Belgrade", null, null));

        Assert.Equal(3, pool.ContactCount);

        var stamped = await db.CallContacts.Where(c => c.PoolId == pool.Id).ToListAsync();
        Assert.Equal(3, stamped.Count);
        Assert.All(stamped, c => Assert.Equal("Belgrade", c.City));
    }

    [Fact]
    public async Task CreateAsync_SecondPoolWithIdenticalFilter_DoesNotStealContactsFromFirstPool()
    {
        await using var db = NewDb(nameof(CreateAsync_SecondPoolWithIdenticalFilter_DoesNotStealContactsFromFirstPool));
        var campaign = await SeedCampaignWithContactsAsync(db, "Belgrade", 4);
        var service = BuildService(db);

        var pool1 = await service.CreateAsync(new CreateCallPoolRequest("Pool 1", campaign.Id, "Belgrade", null, null));
        Assert.Equal(4, pool1.ContactCount);

        var pool2 = await service.CreateAsync(new CreateCallPoolRequest("Pool 2", campaign.Id, "Belgrade", null, null));

        Assert.Equal(0, pool2.ContactCount);

        // All contacts must still belong to pool 1.
        var allContacts = await db.CallContacts.Where(c => c.CampaignId == campaign.Id).ToListAsync();
        Assert.All(allContacts, c => Assert.Equal(pool1.Id, c.PoolId));
    }

    [Fact]
    public async Task RefreshAsync_OnlyPicksUpNewlyAddedStillUnpooledMatchingContacts()
    {
        await using var db = NewDb(nameof(RefreshAsync_OnlyPicksUpNewlyAddedStillUnpooledMatchingContacts));
        var campaign = await SeedCampaignWithContactsAsync(db, "Belgrade", 2);
        var service = BuildService(db);

        var pool1 = await service.CreateAsync(new CreateCallPoolRequest("Pool 1", campaign.Id, "Belgrade", null, null));
        Assert.Equal(2, pool1.ContactCount);

        // A second pool with a different (non-overlapping) filter, so it starts with 0 matches.
        var pool2 = await service.CreateAsync(new CreateCallPoolRequest("Pool 2", campaign.Id, "NoviSad", null, null));
        Assert.Equal(0, pool2.ContactCount);

        // Add a new Belgrade contact (still unpooled) and refresh pool2 with a broadened filter
        // is not possible (filter is fixed on the pool), so instead add a NoviSad contact and
        // confirm refresh only picks that up, not the ones already claimed by pool1.
        db.CallContacts.Add(new CallContact
        {
            FirstName = "New", LastName = "NoviSad", PhoneNumber = "0900",
            City = "NoviSad", CampaignId = campaign.Id,
            CreatedByUserId = "seed", LastModifiedByUserId = "seed"
        });
        await db.SaveChangesAsync();

        var refreshResult = await service.RefreshAsync(pool2.Id);

        Assert.Equal(1, refreshResult.Added);
        Assert.Equal(1, refreshResult.TotalInPool);

        // pool1's contacts remain untouched by pool2's refresh.
        var pool1Contacts = await db.CallContacts.Where(c => c.PoolId == pool1.Id).ToListAsync();
        Assert.Equal(2, pool1Contacts.Count);
    }

    [Fact]
    public async Task BulkCreateByMunicipalityAsync_CreatesOnePoolPerDistinctUnassignedMunicipality()
    {
        await using var db = NewDb(nameof(BulkCreateByMunicipalityAsync_CreatesOnePoolPerDistinctUnassignedMunicipality));
        var campaign = new Campaign { Name = "C1", CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Campaigns.Add(campaign);
        var m1 = new Municipality { Name = "Zvezdara", IsCity = false, CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        var m2 = new Municipality { Name = "Vozdovac", IsCity = false, CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Municipalities.AddRange(m1, m2);
        await db.SaveChangesAsync();

        db.CallContacts.AddRange(
            new CallContact { FirstName = "A", LastName = "L", PhoneNumber = "1", CampaignId = campaign.Id, MunicipalityId = m1.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" },
            new CallContact { FirstName = "B", LastName = "L", PhoneNumber = "2", CampaignId = campaign.Id, MunicipalityId = m1.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" },
            new CallContact { FirstName = "C", LastName = "L", PhoneNumber = "3", CampaignId = campaign.Id, MunicipalityId = m2.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" },
            // No municipality - should be ignored.
            new CallContact { FirstName = "D", LastName = "L", PhoneNumber = "4", CampaignId = campaign.Id, CreatedByUserId = "seed", LastModifiedByUserId = "seed" });
        await db.SaveChangesAsync();

        var service = BuildService(db);
        var result = await service.BulkCreateByMunicipalityAsync(campaign.Id);

        Assert.Equal(2, result.PoolsCreated);
        Assert.Contains(result.Pools, p => p.MunicipalityName == "Zvezdara" && p.ContactCount == 2);
        Assert.Contains(result.Pools, p => p.MunicipalityName == "Vozdovac" && p.ContactCount == 1);

        var stampedM1 = await db.CallContacts.Where(c => c.MunicipalityId == m1.Id).ToListAsync();
        Assert.All(stampedM1, c => Assert.NotNull(c.PoolId));

        // Idempotent: calling again should create no new pools since all matching contacts are now assigned.
        var second = await service.BulkCreateByMunicipalityAsync(campaign.Id);
        Assert.Equal(0, second.PoolsCreated);
    }
}
