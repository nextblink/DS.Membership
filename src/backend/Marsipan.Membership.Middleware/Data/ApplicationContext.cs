using Marsipan.Membership.Middleware.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

/// <summary>
/// EF Core database context. Inherits from <see cref="IdentityDbContext{TUser}"/>
/// to provide ASP.NET Core Identity tables for <see cref="ApplicationUser"/>.
/// Domain DbSets (OrgUnit, Function, Member, Phone, MemberFunction, Form,
/// FormImage) will be added in issue #5.
/// </summary>
public class ApplicationContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationContext(DbContextOptions<ApplicationContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Domain entity configuration and seed data land in issue #5.
    }
}
