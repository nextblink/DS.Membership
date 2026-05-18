using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class AnnouncementServiceCanSendTests
{
    private static ApplicationContext BuildDb()
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ApplicationContext(opts);
    }

    private static (ApplicationContext db, Member trustee, Member plain) Seed()
    {
        var db = BuildDb();
        var committee = new Committee
        {
            Id = 1, Name = "OO", Type = Marsipan.Membership.Middleware.Enums.CommitteeType.Municipal,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Committees.Add(committee);

        var trustee = new Member
        {
            Id = 1, FirstName = "T", LastName = "T", CommitteeId = 1, JMBG = "1111111111111",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        var plain = new Member
        {
            Id = 2, FirstName = "P", LastName = "P", CommitteeId = 1, JMBG = "2222222222222",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        };
        db.Members.AddRange(trustee, plain);
        committee.TrusteeId = 1;
        db.SaveChanges();
        return (db, trustee, plain);
    }

    [Fact]
    public async Task CanSendAsync_Trustee_ReturnsTrue()
    {
        var (db, trustee, _) = Seed();
        var sut = new AnnouncementService(db);
        Assert.True(await sut.CanSendAsync(trustee.Id));
    }

    [Fact]
    public async Task CanSendAsync_FunctionHolder_ReturnsTrue()
    {
        var (db, _, plain) = Seed();
        db.Functions.Add(new Marsipan.Membership.Middleware.Entities.Function
        {
            Id = 1, Name = "Secretary",
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.MemberFunctions.Add(new MemberFunction
        {
            Id = 1, MemberId = plain.Id, FunctionId = 1,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new AnnouncementService(db);
        Assert.True(await sut.CanSendAsync(plain.Id));
    }

    [Fact]
    public async Task CanSendAsync_PlainMember_ReturnsFalse()
    {
        var (db, _, plain) = Seed();
        var sut = new AnnouncementService(db);
        Assert.False(await sut.CanSendAsync(plain.Id));
    }

    [Fact]
    public async Task CanSendAsync_UnknownMember_ReturnsFalse()
    {
        var (db, _, _) = Seed();
        var sut = new AnnouncementService(db);
        Assert.False(await sut.CanSendAsync(999));
    }

    [Fact]
    public async Task CreateAsync_ForcesTargetCommitteeId_FromMember()
    {
        var (db, trustee, _) = Seed();
        var sut = new AnnouncementService(db);
        var req = new CreateAnnouncementRequest("Hello", "Body", null, null, []);
        var result = await sut.CreateAsync(trustee.Id, req);
        Assert.Equal(trustee.CommitteeId, result.TargetCommitteeId);
    }

    [Fact]
    public async Task CreateAsync_WithEventTarget_SetsTargetEventId()
    {
        var (db, trustee, _) = Seed();
        var now = DateTime.UtcNow;
        db.Events.Add(new Event
        {
            Id = 1, Name = "Rally", CommitteeId = 1, CreatedByMemberId = trustee.Id, IsActive = true,
            CreatedDate = now, LastModifiedDate = now, CreatedByUserId = "1", LastModifiedByUserId = "1"
        });
        db.SaveChanges();
        var sut = new AnnouncementService(db);
        var req = new CreateAnnouncementRequest("Protest update", "At 18:00", null, 1, []);
        var result = await sut.CreateAsync(trustee.Id, req);
        Assert.Equal(1, result.TargetEventId);
        Assert.Null(result.TargetCommitteeId);
    }
}
