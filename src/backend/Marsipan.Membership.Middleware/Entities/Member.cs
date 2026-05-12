using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.Entities;

[Table("Members")]
public class Member : BaseEntity
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = null!;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = null!;

    [MaxLength(100)]
    public string? ParentName { get; set; }

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required, MaxLength(13), MinLength(13)]
    public string JMBG { get; set; } = null!;

    [Required]
    public Gender Gender { get; set; }

    [MaxLength(10)]
    public string? PostalCode { get; set; }

    [MaxLength(50)]
    public string? IdCardNumber { get; set; }

    [MaxLength(200)]
    public string? City { get; set; }

    [MaxLength(200), EmailAddress]
    public string? Email { get; set; }

    [Required]
    public MaritalStatus MaritalStatus { get; set; }

    public int? VotingPlaceNumber { get; set; }

    [Required]
    public EducationLevel EducationLevel { get; set; }

    [MaxLength(200)]
    public string? CompanyName { get; set; }

    [MaxLength(200)]
    public string? CompanyCity { get; set; }

    public bool IsPublicCompany { get; set; } = false;

    [MaxLength(200)]
    public string? JobTitle { get; set; }

    [MaxLength(200)]
    public string? Occupation { get; set; }

    [Required]
    public DateOnly MembershipDate { get; set; }

    [Required]
    public int OrgUnitId { get; set; }

    [ForeignKey(nameof(OrgUnitId))]
    public OrgUnit OrgUnit { get; set; } = null!;

    public ICollection<Phone> Phones { get; set; } = [];

    public ICollection<MemberFunction> MemberFunctions { get; set; } = [];

    public ICollection<Form> Forms { get; set; } = [];
}
