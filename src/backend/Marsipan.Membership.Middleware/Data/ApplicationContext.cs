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

    public DbSet<OrgUnit> OrgUnits => Set<OrgUnit>();
    public DbSet<Municipality> Municipalities => Set<Municipality>();
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

        // Self-referential one-to-many for Municipality.
        // Restrict delete to prevent cascading deletes of child municipalities.
        modelBuilder.Entity<Municipality>()
            .HasOne(m => m.Parent)
            .WithMany(m => m.Children)
            .HasForeignKey(m => m.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // OrgUnit.MunicipalityId → Municipality (nullable, restrict delete).
        modelBuilder.Entity<OrgUnit>()
            .HasOne(o => o.Municipality)
            .WithMany()
            .HasForeignKey(o => o.MunicipalityId)
            .OnDelete(DeleteBehavior.Restrict);

        // Municipality.OoId → OrgUnit (nullable back-reference to the OO unit).
        // NoAction prevents circular cascade: OrgUnit→Municipality and Municipality→OrgUnit.
        modelBuilder.Entity<Municipality>()
            .HasOne<OrgUnit>()
            .WithMany()
            .HasForeignKey(m => m.OoId)
            .OnDelete(DeleteBehavior.NoAction);

        // MemberFunction.OrgUnitId → OrgUnit (nullable — set for secondary/national body memberships).
        modelBuilder.Entity<MemberFunction>()
            .HasOne(mf => mf.OrgUnit)
            .WithMany()
            .HasForeignKey(mf => mf.OrgUnitId)
            .OnDelete(DeleteBehavior.Restrict);

        // Unique: a member can hold each function in a given org unit only once.
        modelBuilder.Entity<MemberFunction>()
            .HasIndex(mf => new { mf.MemberId, mf.FunctionId, mf.OrgUnitId })
            .IsUnique();

        // OrgUnit.TrusteeId → Member (nullable, restrict delete so you can't remove a trustee member).
        modelBuilder.Entity<OrgUnit>()
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
        modelBuilder.Entity<OrgUnit>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Municipality>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Function>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Member>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Form>().HasQueryFilter(e => !e.IsDeleted);

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
