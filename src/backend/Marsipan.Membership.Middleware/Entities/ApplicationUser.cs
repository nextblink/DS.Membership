using Microsoft.AspNetCore.Identity;

namespace Marsipan.Membership.Middleware.Entities;

/// <summary>
/// Application user. Extends <see cref="IdentityUser"/> with an optional
/// foreign key to OrgUnit. The OrgUnit entity and the navigation property
/// will be wired up in issue #5 — for now only the FK column lives here.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public int? OrgUnitId { get; set; }

    // public OrgUnit? OrgUnit { get; set; } // will be wired up in #5
}
