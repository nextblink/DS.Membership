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
