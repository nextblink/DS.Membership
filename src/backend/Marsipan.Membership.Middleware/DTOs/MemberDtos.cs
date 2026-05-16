using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>Lightweight projection used by the Members list endpoint.</summary>
public class MemberListItemDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string JMBG { get; set; } = string.Empty;
    public int OrgUnitId { get; set; }
    public string OrgUnitName { get; set; } = string.Empty;
    public DateOnly MembershipDate { get; set; }
    public string Gender { get; set; } = string.Empty;
    public List<string> Functions { get; set; } = new();
}

/// <summary>Full member shape returned by detail / create / update endpoints.</summary>
public class MemberDetailsDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? ParentName { get; set; }
    public DateOnly DateOfBirth { get; set; }
    public string JMBG { get; set; } = string.Empty;
    public Gender Gender { get; set; }
    public string? PostalCode { get; set; }
    public string? IdCardNumber { get; set; }
    public string? City { get; set; }
    public string? Email { get; set; }
    public MaritalStatus MaritalStatus { get; set; }
    public int? VotingPlaceNumber { get; set; }
    public EducationLevel EducationLevel { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyCity { get; set; }
    public bool IsPublicCompany { get; set; }
    public string? JobTitle { get; set; }
    public string? Occupation { get; set; }
    public DateOnly MembershipDate { get; set; }
    public int OrgUnitId { get; set; }
    public string OrgUnitName { get; set; } = string.Empty;
    public List<PhoneDto> Phones { get; set; } = new();
    public List<MemberFunctionDto> Functions { get; set; } = new();
}

public class PhoneDto
{
    public int Id { get; set; }
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class AddPhoneDto
{
    [Required, MaxLength(30)]
    public string Number { get; set; } = string.Empty;

    [Required]
    public PhoneType Type { get; set; }
}

public class MemberFunctionDto
{
    public int Id { get; set; }
    public int FunctionId { get; set; }
    public string FunctionName { get; set; } = string.Empty;
    public DateOnly AssignedDate { get; set; }
}

public class AddMemberFunctionDto
{
    [Required]
    public int FunctionId { get; set; }

    [Required]
    public DateOnly AssignedDate { get; set; }
}

public class CreateMemberDto
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string LastName { get; set; } = string.Empty;
    [MaxLength(100)] public string? ParentName { get; set; }
    [Required] public DateOnly DateOfBirth { get; set; }
    [Required, MaxLength(13), MinLength(13)] public string JMBG { get; set; } = string.Empty;
    [Required] public Gender Gender { get; set; }
    [MaxLength(10)] public string? PostalCode { get; set; }
    [MaxLength(50)] public string? IdCardNumber { get; set; }
    [MaxLength(200)] public string? City { get; set; }
    [MaxLength(200), EmailAddress] public string? Email { get; set; }
    [Required] public MaritalStatus MaritalStatus { get; set; }
    public int? VotingPlaceNumber { get; set; }
    [Required] public EducationLevel EducationLevel { get; set; }
    [MaxLength(200)] public string? CompanyName { get; set; }
    [MaxLength(200)] public string? CompanyCity { get; set; }
    public bool IsPublicCompany { get; set; }
    [MaxLength(200)] public string? JobTitle { get; set; }
    [MaxLength(200)] public string? Occupation { get; set; }
    [Required] public DateOnly MembershipDate { get; set; }
    [Required] public int OrgUnitId { get; set; }

    public List<AddPhoneDto> Phones { get; set; } = new();
    public List<AddMemberFunctionDto> Functions { get; set; } = new();
}

/// <summary>
/// Updates scalar fields on a Member. Phones and functions are managed via
/// the nested endpoints (<c>POST/DELETE /api/members/{id}/phones</c> and
/// <c>.../functions</c>) and are intentionally not accepted here.
/// </summary>
public class UpdateMemberDto
{
    [Required, MaxLength(100)] public string FirstName { get; set; } = string.Empty;
    [Required, MaxLength(100)] public string LastName { get; set; } = string.Empty;
    [MaxLength(100)] public string? ParentName { get; set; }
    [Required] public DateOnly DateOfBirth { get; set; }
    [Required, MaxLength(13), MinLength(13)] public string JMBG { get; set; } = string.Empty;
    [Required] public Gender Gender { get; set; }
    [MaxLength(10)] public string? PostalCode { get; set; }
    [MaxLength(50)] public string? IdCardNumber { get; set; }
    [MaxLength(200)] public string? City { get; set; }
    [MaxLength(200), EmailAddress] public string? Email { get; set; }
    [Required] public MaritalStatus MaritalStatus { get; set; }
    public int? VotingPlaceNumber { get; set; }
    [Required] public EducationLevel EducationLevel { get; set; }
    [MaxLength(200)] public string? CompanyName { get; set; }
    [MaxLength(200)] public string? CompanyCity { get; set; }
    public bool IsPublicCompany { get; set; }
    [MaxLength(200)] public string? JobTitle { get; set; }
    [MaxLength(200)] public string? Occupation { get; set; }
    [Required] public DateOnly MembershipDate { get; set; }
    [Required] public int OrgUnitId { get; set; }
}
