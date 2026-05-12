using System.ComponentModel.DataAnnotations;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Read shape for a <c>Function</c> lookup row.
/// </summary>
public class FunctionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Request body for <c>POST /api/functions</c>.
/// </summary>
public class CreateFunctionDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Request body for <c>PUT /api/functions/{id}</c>.
/// </summary>
public class UpdateFunctionDto
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
}
