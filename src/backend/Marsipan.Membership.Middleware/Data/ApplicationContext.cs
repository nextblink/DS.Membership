using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
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
    // Deterministic timestamp used for all HasData seed rows. EF Core requires
    // seed values to be constant across migrations.
    private static readonly DateTime SeedDate = new(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
    }

    public DbSet<OrgUnit> OrgUnits => Set<OrgUnit>();
    public DbSet<Function> Functions => Set<Function>();
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Phone> Phones => Set<Phone>();
    public DbSet<MemberFunction> MemberFunctions => Set<MemberFunction>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormImage> FormImages => Set<FormImage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique index on Member.JMBG (enforced both at the DB level and via
        // a 409 Conflict at the API layer per project CLAUDE.md).
        modelBuilder.Entity<Member>()
            .HasIndex(m => m.JMBG)
            .IsUnique();

        // Self-referential one-to-many for OrgUnit (City -> Municipal).
        // Restrict delete so cascading a city wipe doesn't take its children with it.
        modelBuilder.Entity<OrgUnit>()
            .HasOne(o => o.Parent)
            .WithMany(o => o.Children)
            .HasForeignKey(o => o.ParentId)
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
        modelBuilder.Entity<OrgUnit>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Function>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Member>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Form>().HasQueryFilter(e => !e.IsDeleted);

        // ----------------------------------------------------------------------
        // Seed data
        // ----------------------------------------------------------------------

        modelBuilder.Entity<Function>().HasData(
            new Function { Id = 1, Name = "Member OB", CreatedDate = SeedDate },
            new Function { Id = 2, Name = "President", CreatedDate = SeedDate },
            new Function { Id = 3, Name = "Vice President", CreatedDate = SeedDate },
            new Function { Id = 4, Name = "Secretary", CreatedDate = SeedDate },
            new Function { Id = 5, Name = "Treasurer", CreatedDate = SeedDate },
            new Function { Id = 6, Name = "Member EC", CreatedDate = SeedDate }
        );

        modelBuilder.Entity<OrgUnit>().HasData(
            new OrgUnit
            {
                Id = 1,
                Name = "Belgrade",
                Type = OrgUnitType.City,
                ParentId = null,
                VoterCount = 0,
                CreatedDate = SeedDate
            },
            new OrgUnit
            {
                Id = 2,
                Name = "Lazarevac",
                Type = OrgUnitType.Municipal,
                ParentId = 1,
                VoterCount = 0,
                CreatedDate = SeedDate
            },
            new OrgUnit
            {
                Id = 3,
                Name = "Novi Sad",
                Type = OrgUnitType.City,
                ParentId = null,
                VoterCount = 0,
                CreatedDate = SeedDate
            }
        );

        modelBuilder.Entity<IdentityRole>().HasData(
            new IdentityRole { Id = "1", Name = "SuperAdmin", NormalizedName = "SUPERADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000001" },
            new IdentityRole { Id = "2", Name = "Admin", NormalizedName = "ADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000002" },
            new IdentityRole { Id = "3", Name = "LocalAdmin", NormalizedName = "LOCALADMIN", ConcurrencyStamp = "00000000-0000-0000-0000-000000000003" },
            new IdentityRole { Id = "4", Name = "Operator", NormalizedName = "OPERATOR", ConcurrencyStamp = "00000000-0000-0000-0000-000000000004" },
            new IdentityRole { Id = "5", Name = "Viewer", NormalizedName = "VIEWER", ConcurrencyStamp = "00000000-0000-0000-0000-000000000005" }
        );
    }
}
