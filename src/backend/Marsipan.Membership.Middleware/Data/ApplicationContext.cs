using Marsipan.Membership.Middleware.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

/// <summary>
/// EF Core database context. Inherits from <see cref="IdentityDbContext{TUser}"/>
/// to provide ASP.NET Core Identity tables for <see cref="ApplicationUser"/>.
/// </summary>
public class ApplicationContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
    }

    public DbSet<Committee> Committees => Set<Committee>();
    public DbSet<Municipality> Municipalities => Set<Municipality>();
    public DbSet<Function> Functions => Set<Function>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Phone> Phones => Set<Phone>();
    public DbSet<MemberFunction> MemberFunctions => Set<MemberFunction>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormImage> FormImages => Set<FormImage>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<AnnouncementLike> AnnouncementLikes => Set<AnnouncementLike>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<FcmSubscription> FcmSubscriptions => Set<FcmSubscription>();
    public DbSet<TelegramLink> TelegramLinks => Set<TelegramLink>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventMembership> EventMemberships => Set<EventMembership>();
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CallContact> CallContacts => Set<CallContact>();
    public DbSet<CallAttempt> CallAttempts => Set<CallAttempt>();
    public DbSet<ContactEngagementArea> ContactEngagementAreas => Set<ContactEngagementArea>();
    public DbSet<CallPool> CallPools => Set<CallPool>();
    public DbSet<CallPoolOperator> CallPoolOperators => Set<CallPoolOperator>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique index on Member.JMBG (enforced both at the DB level and via
        // a 409 Conflict at the API layer per project CLAUDE.md).
        modelBuilder.Entity<Member>()
            .HasIndex(m => m.JMBG)
            .IsUnique();

        // Self-referential one-to-many for Committee (City -> Municipal).
        // Restrict delete so cascading a city wipe doesn't take its children with it.
        modelBuilder.Entity<Committee>()
            .HasOne(o => o.Parent)
            .WithMany(o => o.Children)
            .HasForeignKey(o => o.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Self-referential one-to-many for Municipality.
        // Restrict delete to prevent cascading deletes of child municipalities.
        modelBuilder.Entity<Municipality>()
            .HasOne(m => m.Parent)
            .WithMany(m => m.Children)
            .HasForeignKey(m => m.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Committee.MunicipalityId → Municipality (nullable, restrict delete).
        modelBuilder.Entity<Committee>()
            .HasOne(o => o.Municipality)
            .WithMany()
            .HasForeignKey(o => o.MunicipalityId)
            .OnDelete(DeleteBehavior.Restrict);

        // Municipality.OoId → Committee (nullable back-reference to the OO unit).
        // NoAction prevents circular cascade: Committee→Municipality and Municipality→Committee.
        modelBuilder.Entity<Municipality>()
            .HasOne<Committee>()
            .WithMany()
            .HasForeignKey(m => m.OoId)
            .OnDelete(DeleteBehavior.NoAction);

        // MemberFunction.CommitteeId → Committee (nullable — set for secondary/national body memberships).
        modelBuilder.Entity<MemberFunction>()
            .HasOne(mf => mf.Committee)
            .WithMany()
            .HasForeignKey(mf => mf.CommitteeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique: a member can hold each function in a given committee only once.
        modelBuilder.Entity<MemberFunction>()
            .HasIndex(mf => new { mf.MemberId, mf.FunctionId, mf.CommitteeId })
            .IsUnique();

        // Committee.TrusteeId → Member (nullable, restrict delete so you can't remove a trustee member).
        modelBuilder.Entity<Committee>()
            .HasOne(o => o.Trustee)
            .WithMany()
            .HasForeignKey(o => o.TrusteeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Form.CreatedByUserId is redeclared on Form (see Form.cs) as a non-nullable
        // FK to AspNetUsers. Configure the relationship + delete behavior explicitly.
        modelBuilder.Entity<Form>()
            .HasOne(f => f.CreatedBy)
            .WithMany()
            .HasForeignKey(f => f.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Soft-delete query filters on aggregate roots only. Owned children
        // (Phone, MemberFunction, FormImage) ride along with their parent and
        // intentionally do not get an independent filter.
        modelBuilder.Entity<Committee>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Municipality>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Function>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Member>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Form>().HasQueryFilter(e => !e.IsDeleted);

        // AnnouncementLike unique: one like per member per announcement
        modelBuilder.Entity<AnnouncementLike>()
            .HasIndex(al => new { al.AnnouncementId, al.MemberId })
            .IsUnique();

        // FcmSubscription: unique FCM token
        modelBuilder.Entity<FcmSubscription>()
            .HasIndex(f => f.FcmToken)
            .IsUnique();

        // TelegramLink: one per member, unique Telegram user ID
        modelBuilder.Entity<TelegramLink>()
            .HasIndex(t => t.MemberId)
            .IsUnique();
        modelBuilder.Entity<TelegramLink>()
            .HasIndex(t => t.TelegramUserId)
            .IsUnique();

        // Soft-delete filter on Announcement
        modelBuilder.Entity<Announcement>().HasQueryFilter(e => !e.IsDeleted);

        // Prevent cascade cycles: Announcement→Member (author) and AnnouncementLike→Member
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.Author)
            .WithMany()
            .HasForeignKey(a => a.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AnnouncementLike>()
            .HasOne(al => al.Member)
            .WithMany()
            .HasForeignKey(al => al.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.TargetCommittee)
            .WithMany()
            .HasForeignKey(a => a.TargetCommitteeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.TargetFunction)
            .WithMany()
            .HasForeignKey(a => a.TargetFunctionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<FcmSubscription>()
            .HasOne(f => f.Member)
            .WithMany()
            .HasForeignKey(f => f.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TelegramLink>()
            .HasOne(t => t.Member)
            .WithMany()
            .HasForeignKey(t => t.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // EventMembership: unique per (event, member)
        modelBuilder.Entity<EventMembership>()
            .HasIndex(em => new { em.EventId, em.MemberId })
            .IsUnique();

        // Prevent cascade cycles for Event → Committee and Event → Member (CreatedBy)
        modelBuilder.Entity<Event>()
            .HasOne(e => e.Committee)
            .WithMany()
            .HasForeignKey(e => e.CommitteeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // EventMembership → Member (no cascade to avoid cycles)
        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.Member)
            .WithMany()
            .HasForeignKey(em => em.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.AddedBy)
            .WithMany()
            .HasForeignKey(em => em.AddedByMemberId)
            .OnDelete(DeleteBehavior.NoAction);

        // EventMembership → Event (cascade delete memberships when event is hard-deleted)
        modelBuilder.Entity<EventMembership>()
            .HasOne(em => em.Event)
            .WithMany(e => e.Memberships)
            .HasForeignKey(em => em.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        // Announcement → Event (restrict delete so you can't remove an event with announcements)
        modelBuilder.Entity<Announcement>()
            .HasOne(a => a.TargetEvent)
            .WithMany()
            .HasForeignKey(a => a.TargetEventId)
            .OnDelete(DeleteBehavior.Restrict);

        // Soft-delete filter on Event
        modelBuilder.Entity<Event>().HasQueryFilter(e => !e.IsDeleted);

        // ----- Call center -----

        // Campaign is an aggregate root: soft-delete filter.
        modelBuilder.Entity<Campaign>().HasQueryFilter(e => !e.IsDeleted);

        // CallContact aggregate root: soft-delete filter + report/query indexes.
        modelBuilder.Entity<CallContact>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.FinalStatus);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.PoolId);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.CampaignId);
        modelBuilder.Entity<CallContact>().HasIndex(c => c.PhoneNumber);

        // CallPool aggregate root: soft-delete filter.
        modelBuilder.Entity<CallPool>().HasQueryFilter(e => !e.IsDeleted);

        // CallContact → Campaign (restrict: deleting a campaign must not wipe contacts).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Campaign)
            .WithMany(c => c.Contacts)
            .HasForeignKey(c => c.CampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallContact → CallPool (nullable; SetNull so releasing/deleting a pool clears membership).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Pool)
            .WithMany(p => p.Contacts)
            .HasForeignKey(c => c.PoolId)
            .OnDelete(DeleteBehavior.SetNull);

        // CallContact → Member links (nullable, restrict).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.MatchedMember)
            .WithMany()
            .HasForeignKey(c => c.MatchedMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.ConvertedMember)
            .WithMany()
            .HasForeignKey(c => c.ConvertedMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallContact → Municipality (nullable, restrict).
        modelBuilder.Entity<CallContact>()
            .HasOne(c => c.Municipality)
            .WithMany()
            .HasForeignKey(c => c.MunicipalityId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallAttempt → CallContact (cascade: attempts are owned by the contact).
        modelBuilder.Entity<CallAttempt>()
            .HasOne(a => a.CallContact)
            .WithMany(c => c.Attempts)
            .HasForeignKey(a => a.CallContactId)
            .OnDelete(DeleteBehavior.Cascade);

        // ContactEngagementArea → CallContact (cascade: owned child).
        modelBuilder.Entity<ContactEngagementArea>()
            .HasOne(e => e.CallContact)
            .WithMany(c => c.EngagementAreas)
            .HasForeignKey(e => e.CallContactId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ContactEngagementArea>()
            .HasIndex(e => new { e.CallContactId, e.Area })
            .IsUnique();

        // CallPool → Campaign (restrict).
        modelBuilder.Entity<CallPool>()
            .HasOne(p => p.Campaign)
            .WithMany(c => c.Pools)
            .HasForeignKey(p => p.CampaignId)
            .OnDelete(DeleteBehavior.Restrict);

        // CallPoolOperator → CallPool (cascade) and → ApplicationUser (restrict).
        modelBuilder.Entity<CallPoolOperator>()
            .HasOne(o => o.CallPool)
            .WithMany(p => p.Operators)
            .HasForeignKey(o => o.CallPoolId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<CallPoolOperator>()
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<CallPoolOperator>()
            .HasIndex(o => new { o.CallPoolId, o.UserId })
            .IsUnique();

        // ----------------------------------------------------------------------
        // Seed data — roles only; all other data is managed via admin UI
        // ----------------------------------------------------------------------

        modelBuilder.Entity<IdentityRole>().HasData(
            new IdentityRole { Id = "1", Name = "SuperAdmin", NormalizedName = "SUPERADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000001" },
            new IdentityRole { Id = "2", Name = "Admin", NormalizedName = "ADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000002" },
            new IdentityRole { Id = "3", Name = "LocalAdmin", NormalizedName = "LOCALADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000003" },
            new IdentityRole { Id = "4", Name = "Operator", NormalizedName = "OPERATOR", ConcurrencyStamp = "00000000-0000-0000-0000-000000000004" },
            new IdentityRole { Id = "5", Name = "Viewer", NormalizedName = "VIEWER", ConcurrencyStamp = "00000000-0000-0000-0000-000000000005" }
        );
    }
}
