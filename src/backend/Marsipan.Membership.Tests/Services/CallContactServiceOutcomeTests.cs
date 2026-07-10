using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
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

public class CallContactServiceOutcomeTests
{
    private static ApplicationContext NewDb(string name)
    {
        var options = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationContext(options);
    }

    private static async Task<(ApplicationContext db, CallContact contact)> SeedAsync(string dbName)
    {
        var db = NewDb(dbName);
        var campaign = new Campaign { Name = "C1", CreatedByUserId = "seed", LastModifiedByUserId = "seed" };
        db.Campaigns.Add(campaign);
        await db.SaveChangesAsync();

        var contact = new CallContact
        {
            FirstName = "Ana",
            LastName = "Anic",
            PhoneNumber = "0601234567",
            CampaignId = campaign.Id,
            ClaimedByUserId = "admin-1",
            ClaimedAt = DateTime.UtcNow,
            CreatedByUserId = "seed",
            LastModifiedByUserId = "seed"
        };
        db.CallContacts.Add(contact);
        await db.SaveChangesAsync();

        return (db, contact);
    }

    private static CallContactService BuildService(ApplicationContext db, string userId = "admin-1")
    {
        var user = new FakeUser { Id = userId, Role = ScopeFilters.RoleAdmin };
        return new CallContactService(db, user, new NoopImportService());
    }

    private static SaveCallOutcomeRequest ValidContactRequest(
        PartyRelation relation, ActivityLevel? activity = null) =>
        new(
            CallOutcome.ValidContact,
            AttemptNote: null,
            PartyRelation: relation,
            ActivityLevel: activity,
            WantsToBeActive: null,
            EngagementAreas: null,
            UpdatedPhone: null,
            UpdatedEmail: null,
            UpdatedAddress: null,
            SuggestionNote: null,
            KnowsPotentialMembers: null,
            WillingToEnroll: null);

    [Fact]
    public async Task NoCooperation_SetsFinalStatus_NoCooperation()
    {
        var (db, contact) = await SeedAsync(nameof(NoCooperation_SetsFinalStatus_NoCooperation));
        var service = BuildService(db);

        await service.SaveOutcomeAsync(contact.Id, ValidContactRequest(PartyRelation.NoCooperation));

        var updated = await db.CallContacts.FindAsync(contact.Id);
        Assert.Equal(ContactFinalStatus.NoCooperation, updated!.FinalStatus);
    }

    [Fact]
    public async Task Sympathizer_SetsFinalStatus_Sympathizer()
    {
        var (db, contact) = await SeedAsync(nameof(Sympathizer_SetsFinalStatus_Sympathizer));
        var service = BuildService(db);

        await service.SaveOutcomeAsync(contact.Id, ValidContactRequest(PartyRelation.Sympathizer));

        var updated = await db.CallContacts.FindAsync(contact.Id);
        Assert.Equal(ContactFinalStatus.Sympathizer, updated!.FinalStatus);
    }

    [Fact]
    public async Task StayMember_Inactive_SetsFinalStatus_InactiveMember()
    {
        var (db, contact) = await SeedAsync(nameof(StayMember_Inactive_SetsFinalStatus_InactiveMember));
        var service = BuildService(db);

        await service.SaveOutcomeAsync(contact.Id, ValidContactRequest(PartyRelation.StayMember, ActivityLevel.Inactive));

        var updated = await db.CallContacts.FindAsync(contact.Id);
        Assert.Equal(ContactFinalStatus.InactiveMember, updated!.FinalStatus);
    }

    [Theory]
    [InlineData(ActivityLevel.Active)]
    [InlineData(ActivityLevel.Occasional)]
    public async Task StayMember_ActiveOrOccasional_SetsFinalStatus_ActiveMember(ActivityLevel activity)
    {
        var (db, contact) = await SeedAsync(nameof(StayMember_ActiveOrOccasional_SetsFinalStatus_ActiveMember) + activity);
        var service = BuildService(db);

        await service.SaveOutcomeAsync(contact.Id, ValidContactRequest(PartyRelation.StayMember, activity));

        var updated = await db.CallContacts.FindAsync(contact.Id);
        Assert.Equal(ContactFinalStatus.ActiveMember, updated!.FinalStatus);
    }

    [Fact]
    public async Task NonValidContactOutcome_LeavesFinalStatusNull_ButRecordsAttemptAndClearsClaim()
    {
        var (db, contact) = await SeedAsync(nameof(NonValidContactOutcome_LeavesFinalStatusNull_ButRecordsAttemptAndClearsClaim));
        var service = BuildService(db);

        var request = new SaveCallOutcomeRequest(
            CallOutcome.WrongNumber,
            AttemptNote: "not this person",
            PartyRelation: null,
            ActivityLevel: null,
            WantsToBeActive: null,
            EngagementAreas: null,
            UpdatedPhone: null,
            UpdatedEmail: null,
            UpdatedAddress: null,
            SuggestionNote: null,
            KnowsPotentialMembers: null,
            WillingToEnroll: null);

        await service.SaveOutcomeAsync(contact.Id, request);

        var updated = await db.CallContacts.FindAsync(contact.Id);
        Assert.Null(updated!.FinalStatus);
        Assert.Equal(1, updated.AttemptCount);
        Assert.Equal(CallOutcome.WrongNumber, updated.LastOutcome);
        Assert.NotNull(updated.LastCalledAt);
        Assert.Null(updated.ClaimedByUserId);
        Assert.Null(updated.ClaimedAt);

        var attempts = await db.CallAttempts.Where(a => a.CallContactId == contact.Id).ToListAsync();
        Assert.Single(attempts);
        Assert.Equal(CallOutcome.WrongNumber, attempts[0].Outcome);
    }
}
