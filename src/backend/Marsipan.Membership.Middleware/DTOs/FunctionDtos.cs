using System.ComponentModel.DataAnnotations;
using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public class FunctionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public OrgUnitType? OrgUnitType { get; set; }
    public int? MaxNumberOfPeople { get; set; }
}

public class CreateFunctionDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public OrgUnitType? OrgUnitType { get; set; }
    public int? MaxNumberOfPeople { get; set; }
}

public class UpdateFunctionDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    public OrgUnitType? OrgUnitType { get; set; }
    public int? MaxNumberOfPeople { get; set; }
}
