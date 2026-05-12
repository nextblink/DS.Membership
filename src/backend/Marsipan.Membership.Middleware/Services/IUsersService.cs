using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// SuperAdmin-only user management. All operations validate that restricted
/// roles (<c>LocalAdmin</c>, <c>Operator</c>, <c>Viewer</c>) are bound to an
/// <c>OrgUnitId</c>.
/// </summary>
public interface IUsersService
{
    Task<List<UserDto>> ListAsync(CancellationToken ct);

    Task<UserDto?> GetByIdAsync(string id, CancellationToken ct);

    /// <summary>
    /// Create a new Identity user, assign a role, and persist the optional
    /// <c>OrgUnitId</c>. Throws <see cref="UserValidationException"/> on bad
    /// role / missing OrgUnitId. Throws <see cref="UserConflictException"/> on
    /// duplicate email.
    /// </summary>
    Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken ct);

    /// <summary>
    /// Replace the user's role and <c>OrgUnitId</c>. Returns <c>false</c> if
    /// the user does not exist.
    /// </summary>
    Task<bool> UpdateAsync(string id, UpdateUserDto dto, CancellationToken ct);

    /// <summary>
    /// Hard-delete the Identity user. ApplicationUser does not inherit from
    /// BaseEntity, so soft-delete is not applicable here.
    /// </summary>
    Task<bool> DeleteAsync(string id, CancellationToken ct);
}

/// <summary>
/// Thrown when a user create/update request fails validation (unknown role,
/// missing required <c>OrgUnitId</c>, etc.). Controllers map this to 400.
/// </summary>
public class UserValidationException : Exception
{
    public UserValidationException(string message) : base(message) { }
}

/// <summary>
/// Thrown when a user create request collides with an existing record
/// (duplicate email). Controllers map this to 409.
/// </summary>
public class UserConflictException : Exception
{
    public UserConflictException(string message) : base(message) { }
}
