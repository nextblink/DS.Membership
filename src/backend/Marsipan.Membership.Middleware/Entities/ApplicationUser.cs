using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace Marsipan.Membership.Middleware.Entities;

/// <summary>
/// Application user. Extends <see cref="IdentityUser"/> with an optional
/// foreign key and navigation to <see cref="Committee"/>.
/// </summary>
public class ApplicationUser : IdentityUser
{
    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public int? CommitteeId { get; set; }

    [ForeignKey(nameof(CommitteeId))]
    public Committee? Committee { get; set; }
}
