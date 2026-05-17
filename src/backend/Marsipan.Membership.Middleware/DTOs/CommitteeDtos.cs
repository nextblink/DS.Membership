using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public class CommitteeTreeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int? MunicipalityId { get; set; }
    public int VoterCount { get; set; }
    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }
    public bool IsTrustful { get; set; }
    public int MemberCount { get; set; }
    public int? MaxMembers { get; set; }
    public List<CommitteeTreeDto> Children { get; set; } = new();
}

public class CommitteeDetailsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public CommitteeType Type { get; set; }
    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }
    public int VoterCount { get; set; }
    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }
    public bool IsTrustful { get; set; }
    public int MemberCount { get; set; }
    public int? MaxMembers { get; set; }
}

public class CreateCommitteeDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public CommitteeType Type { get; set; }

    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }
    public bool IsTrustful { get; set; } = true;
    public int? MaxMembers { get; set; }
}

public class UpdateCommitteeDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public CommitteeType Type { get; set; }

    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }
    public bool IsTrustful { get; set; } = true;
    public int? MaxMembers { get; set; }
}
