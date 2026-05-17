using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Marsipan.Membership.Middleware.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Marsipan.Membership.Telegram.Tests.Services;

public class SyncServiceTests
{
    private static ApplicationContext CreateDb(string name)
    {
        var opts = new DbContextOptionsBuilder<ApplicationContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new ApplicationContext(opts);
    }

    private static readonly string SysUserId = "sys";

    private static Member MakeMember(int id, int committeeId, ApplicationContext db)
    {
        var m = new Member
        {
            Id = id, FirstName = "A", LastName = "B", JMBG = id.ToString().PadLeft(13, '0'),
            DateOfBirth = new DateOnly(1990, 1, 1), Gender = Gender.Male,
            MaritalStatus = MaritalStatus.Single, EducationLevel = EducationLevel.Secondary,
            MembershipDate = new DateOnly(2020, 1, 1), CommitteeId = committeeId,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.Members.Add(m);
        return m;
    }

    private static Committee MakeCommittee(int id, CommitteeType type, ApplicationContext db)
    {
        var c = new Committee
        {
            Id = id, Name = $"Committee{id}", Type = type,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.Committees.Add(c);
        return c;
    }

    private static Announcement MakeAnnouncement(int id, int authorId, CommitteeType? level, int? committeeId, int? functionId, ApplicationContext db)
    {
        var a = new Announcement
        {
            Id = id, Title = $"Ann{id}", Body = "body", AuthorId = authorId,
            TargetLevel = level, TargetCommitteeId = committeeId, TargetFunctionId = functionId,
            CreatedDate = DateTime.UtcNow, LastModifiedDate = DateTime.UtcNow,
            CreatedByUserId = SysUserId, LastModifiedByUserId = SysUserId
        };
        db.Announcements.Add(a);
        return a;
    }

    [Fact]
    public async Task GetDeltaAsync_NoTargeting_ReturnedForAllMembers()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_NoTargeting_ReturnedForAllMembers));
        MakeCommittee(1, CommitteeType.Municipal, db);
        MakeMember(1, 1, db);
        MakeAnnouncement(1, 1, null, null, null, db);
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Single(result.Announcements);
    }

    [Fact]
    public async Task GetDeltaAsync_CommitteeTargeting_ExcludesDifferentUnit()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_CommitteeTargeting_ExcludesDifferentUnit));
        MakeCommittee(1, CommitteeType.Municipal, db);
        MakeCommittee(2, CommitteeType.Municipal, db);
        MakeMember(1, committeeId: 1, db);
        MakeAnnouncement(1, 1, null, committeeId: 2, null, db);
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Empty(result.Announcements);
    }

    [Fact]
    public async Task GetDeltaAsync_FunctionTargeting_ExcludesNonHolder()
    {
        using var db = CreateDb(nameof(GetDeltaAsync_FunctionTargeting_ExcludesNonHolder));
        MakeCommittee(1, CommitteeType.Municipal, db);
        MakeMember(1, committeeId: 1, db);
        MakeAnnouncement(1, 1, null, null, functionId: 5, db);
        await db.SaveChangesAsync();

        var svc = new SyncService(db);
        var result = await svc.GetDeltaAsync(memberId: 1, since: null);

        Assert.Empty(result.Announcements);
    }
}
