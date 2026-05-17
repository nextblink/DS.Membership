using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Row shape for <c>GET /api/forms</c> list results.
/// </summary>
public class FormListItemDto
{
    public int Id { get; set; }
    public string? FormNumber { get; set; }
    public string? MemberFullName { get; set; }
    public int? CommitteeId { get; set; }
    public string? CommitteeName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public string? CreatedByEmail { get; set; }
}

/// <summary>
/// Linked-member summary embedded in <see cref="FormDetailsDto"/>.
/// </summary>
public class FormMemberSummaryDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string JMBG { get; set; } = string.Empty;
    public int CommitteeId { get; set; }
    public string? CommitteeName { get; set; }
}

/// <summary>
/// Image row shape, includes <see cref="Order"/> for drag-and-drop reordering.
/// </summary>
public class FormImageDto
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public int Order { get; set; }
}

/// <summary>
/// Full Form details — metadata plus linked member summary and the ordered
/// image list.
/// </summary>
public class FormDetailsDto
{
    public int Id { get; set; }
    public string? FormNumber { get; set; }
    public DateOnly? FormDate { get; set; }
    public string? MunicipalBoard { get; set; }
    public int? MemberId { get; set; }
    public FormMemberSummaryDto? Member { get; set; }
    public FormStatus Status { get; set; }
    public string CreatedByUserId { get; set; } = string.Empty;
    public string? CreatedByEmail { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastModifiedDate { get; set; }
    public IReadOnlyList<FormImageDto> Images { get; set; } = Array.Empty<FormImageDto>();
}

/// <summary>
/// Metadata portion of the multipart create payload (<c>POST /api/forms</c>).
/// </summary>
public class CreateFormMetadataDto
{
    [MaxLength(50)]
    public string? FormNumber { get; set; }

    public DateOnly? FormDate { get; set; }

    [MaxLength(200)]
    public string? MunicipalBoard { get; set; }

    public int? MemberId { get; set; }

}

/// <summary>
/// Request body for <c>PUT /api/forms/{id}</c>. Does not include status —
/// status updates go through the dedicated PATCH endpoint.
/// </summary>
public class UpdateFormDto
{
    [MaxLength(50)]
    public string? FormNumber { get; set; }

    public DateOnly? FormDate { get; set; }

    [MaxLength(200)]
    public string? MunicipalBoard { get; set; }

    public int? MemberId { get; set; }

}

/// <summary>
/// Request body for <c>PATCH /api/forms/{id}/status</c>.
/// </summary>
public class UpdateFormStatusDto
{
    [Required]
    public FormStatus Status { get; set; }
}

/// <summary>
/// Query string shape for <c>GET /api/forms</c>.
/// </summary>
public class FormQuery
{
    public string? FormNumber { get; set; }
    public int? CommitteeId { get; set; }
    public FormStatus? Status { get; set; }
    public string? MemberName { get; set; }
    public int? MemberId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Data extracted from a paper "Евиденциони образац" form by the Claude vision API.
/// All fields are nullable — null means Claude could not read that field.
/// </summary>
public class ExtractedFormDataDto
{
    // Member personal fields
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ParentName { get; set; }
    public string? DateOfBirth { get; set; }     // ISO date: YYYY-MM-DD
    public string? Jmbg { get; set; }
    public string? Gender { get; set; }           // "Male" | "Female"
    public string? PostalCode { get; set; }
    public string? IdCardNumber { get; set; }
    public string? City { get; set; }
    public string? Email { get; set; }
    public List<ExtractedPhoneDto> Phones { get; set; } = new();
    public string? MaritalStatus { get; set; }    // enum name: Single|Married|Divorced|Widowed
    public string? VotingPlace { get; set; }
    public int? VotingPlaceNumber { get; set; }
    public string? EducationLevel { get; set; }   // enum name: Primary|Secondary|Higher|University|Masters|Doctorate
    public string? Occupation { get; set; }
    public string? JobTitle { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyCity { get; set; }
    public bool? IsPublicCompany { get; set; }

    // Form record metadata (from the stamp in the top-right of the paper form)
    public string? FormNumber { get; set; }
    public string? FormDate { get; set; }         // ISO date: YYYY-MM-DD
    public string? CommitteeName { get; set; }      // e.g. "Opštinski odbor Lazarevac"

    // Party function written on the form (e.g. "Član OO")
    public string? Function { get; set; }
}

public class ExtractedPhoneDto
{
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = "Mobile";   // "Mobile" | "Landline" | "Business"
}
