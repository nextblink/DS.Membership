using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace Marsipan.Membership.Middleware.Entities;

/// <summary>
/// Application user. Extends <see cref="IdentityUser"/> with an optional
/// foreign key and navigation to <see cref="OrgUnit"/>.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public int? OrgUnitId { get; set; }

    [ForeignKey(nameof(OrgUnitId))]
    public OrgUnit? OrgUnit { get; set; }
}
