using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Node in the OrgUnit tree returned by <c>GET /api/orgunits</c>.
/// Roots are the units whose <see cref="OrgUnitDetailsDto.ParentId"/> is null.
/// </summary>
public class OrgUnitTreeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>String form of <see cref="OrgUnitType"/> (e.g. "City", "Municipal").</summary>
    public string Type { get; set; } = string.Empty;

    public int? MunicipalityId { get; set; }

    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }

    public bool IsTrustful { get; set; }

    /// <summary>Count of non-deleted Members directly assigned to this unit.</summary>
    public int MemberCount { get; set; }

    public List<OrgUnitTreeDto> Children { get; set; } = new();
}

/// <summary>
/// Flat details for a single OrgUnit. Returned by
/// <c>GET /api/orgunits/{id}</c>, <c>POST /api/orgunits</c>, and after updates.
/// </summary>
public class OrgUnitDetailsDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public OrgUnitType Type { get; set; }
    public int? ParentId { get; set; }
    public int? MunicipalityId { get; set; }
    public int VoterCount { get; set; }
    public int? TrusteeId { get; set; }
    public string? TrusteeName { get; set; }
    public bool IsTrustful { get; set; }
    public int MemberCount { get; set; }
}

/// <summary>
/// Create request body for <c>POST /api/orgunits</c>. SuperAdmin-only.
/// </summary>
public class CreateOrgUnitDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public OrgUnitType Type { get; set; }

    public int? ParentId { get; set; }

    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }

    public bool IsTrustful { get; set; } = true;
}

/// <summary>
/// Update request body for <c>PUT /api/orgunits/{id}</c>. SuperAdmin-only.
/// </summary>
public class UpdateOrgUnitDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public OrgUnitType Type { get; set; }

    public int? ParentId { get; set; }

    public int? MunicipalityId { get; set; }

    [Range(0, int.MaxValue)]
    public int VoterCount { get; set; }

    public int? TrusteeId { get; set; }

    public bool IsTrustful { get; set; } = true;
}
