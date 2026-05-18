using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class EventServiceTests
{
    private static ApplicationContext BuildDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationContext(opts);
    }

    private static (ApplicationContext db, Member trustee, Member plainMember, Committee committee) SeedBasic()
    {
        var db = BuildDb();
        var committee = new Committee
        {
            Id = 1, Name = "OO Test", Type = Marsipan.Membership.Middleware.Enums.CommitteeType.Municipal,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Committees.Add(committee);

        var trustee = new Member
        {
            Id = 1, FirstName = "Ana", LastName = "Trustee", CommitteeId = 1,
            JMBG = "1111111111111",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        var plain = new Member
        {
            Id = 2, FirstName = "Bob", LastName = "Plain", CommitteeId = 1,
            JMBG = "2222222222222",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Members.AddRange(trustee, plain);
        committee.TrusteeId = 1;
        db.SaveChanges();
        return (db, trustee, plain, committee);
    }

    [Fact]
    public async Task CanManageAsync_Trustee_ReturnsTrue()
    {
        var (db, trustee, _, _) = SeedBasic();
        var sut = new EventService(db);
        Assert.True(await sut.CanManageAsync(trustee.Id));
    }

    [Fact]
    public async Task CanManageAsync_MemberWithFunction_ReturnsTrue()
    {
        var (db, _, plain, _) = SeedBasic();
        db.Functions.Add(new Marsipan.Membership.Middleware.Entities.Function
        {
            Id = 1, Name = "Secretary",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.MemberFunctions.Add(new MemberFunction
        {
            Id = 1, MemberId = plain.Id, FunctionId = 1, CommitteeId = null,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new EventService(db);
        Assert.True(await sut.CanManageAsync(plain.Id));
    }

    [Fact]
    public async Task CanManageAsync_PlainMember_ReturnsFalse()
    {
        var (db, _, plain, _) = SeedBasic();
        var sut = new EventService(db);
        Assert.False(await sut.CanManageAsync(plain.Id));
    }

    [Fact]
    public async Task CreateAsync_Trustee_CreatesEvent()
    {
        var (db, trustee, _, committee) = SeedBasic();
        var sut = new EventService(db);
        var request = new CreateEventRequest("Protest March", "City center", true, null);
        var result = await sut.CreateAsync(trustee.Id, request);
        Assert.Equal("Protest March", result.Name);
        Assert.Equal(committee.Id, result.CommitteeId);
        Assert.Equal(trustee.Id, result.CreatedByMemberId);
    }

    [Fact]
    public async Task JoinAsync_AddsEventMembership()
    {
        var (db, trustee, plain, committee) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        var membership = await db.EventMemberships.FirstOrDefaultAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.NotNull(membership);
        Assert.Null(membership.AddedByMemberId);
    }

    [Fact]
    public async Task JoinAsync_InactiveEvent_ThrowsInvalidOperation()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Closed", null, false, null));
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.JoinAsync(evt.Id, plain.Id));
    }

    [Fact]
    public async Task JoinAsync_Duplicate_IsIdempotent()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        await sut.JoinAsync(evt.Id, plain.Id);
        var count = await db.EventMemberships.CountAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task LeaveAsync_RemovesMembership()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.JoinAsync(evt.Id, plain.Id);
        await sut.LeaveAsync(evt.Id, plain.Id);
        var membership = await db.EventMemberships.FirstOrDefaultAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Null(membership);
    }

    [Fact]
    public async Task AddMemberAsync_OrganizerAdds_SetsSelfSignupFalse()
    {
        var (db, trustee, plain, _) = SeedBasic();
        var sut = new EventService(db);
        var evt = await sut.CreateAsync(trustee.Id, new CreateEventRequest("Rally", null, true, null));
        await sut.AddMemberAsync(evt.Id, trustee.Id, plain.Id);
        var membership = await db.EventMemberships.FirstAsync(em => em.EventId == evt.Id && em.MemberId == plain.Id);
        Assert.Equal(trustee.Id, membership.AddedByMemberId);
    }
}
