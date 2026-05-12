using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// <see cref="IUsersService"/> implementation backed by ASP.NET Core Identity.
/// </summary>
public class UsersService : IUsersService
{
    // Known roles, in highest-precedence-first order. Mirrors the constants
    // declared on <see cref="ScopeFilters"/> but kept local so this service is
    // self-contained.
    private static readonly string[] KnownRoles =
    {
        ScopeFilters.RoleSuperAdmin,
        ScopeFilters.RoleAdmin,
        ScopeFilters.RoleLocalAdmin,
        ScopeFilters.RoleOperator,
        ScopeFilters.RoleViewer,
    };

    // Roles that require an OrgUnitId to be set on the user.
    private static readonly HashSet<string> RolesRequiringOrgUnit = new(StringComparer.Ordinal)
    {
        ScopeFilters.RoleLocalAdmin,
        ScopeFilters.RoleOperator,
        ScopeFilters.RoleViewer,
    };

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly ApplicationContext _db;

    public UsersService(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        ApplicationContext db)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _db = db;
    }

    public async Task<List<UserDto>> ListAsync(CancellationToken ct)
    {
        // Pull users + their org-unit name in a single query, then resolve role
        // server-side via UserManager (Identity doesn't expose role names on
        // the user row directly).
        var users = await _db.Users
            .AsNoTracking()
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.OrgUnitId,
                OrgUnitName = u.OrgUnit != null ? u.OrgUnit.Name : null,
            })
            .ToListAsync(ct);

        var result = new List<UserDto>(users.Count);
        foreach (var u in users)
        {
            // Fetch the user entity to use UserManager.GetRolesAsync — this
            // keeps role resolution canonical (uses Identity's normalized
            // names rather than rummaging through join tables ourselves).
            var entity = await _userManager.FindByIdAsync(u.Id);
            var role = entity is null ? string.Empty : HighestPrecedenceRole(await _userManager.GetRolesAsync(entity));

            result.Add(new UserDto
            {
                Id = u.Id,
                Email = u.Email ?? string.Empty,
                Role = role,
                OrgUnitId = u.OrgUnitId,
                OrgUnitName = u.OrgUnitName,
            });
        }

        return result;
    }

    public async Task<UserDto?> GetByIdAsync(string id, CancellationToken ct)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.OrgUnit)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null)
            return null;

        var entity = await _userManager.FindByIdAsync(id);
        var role = entity is null ? string.Empty : HighestPrecedenceRole(await _userManager.GetRolesAsync(entity));

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            Role = role,
            OrgUnitId = user.OrgUnitId,
            OrgUnitName = user.OrgUnit?.Name,
        };
    }

    public async Task<UserDto> CreateAsync(CreateUserDto dto, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(dto);

        await ValidateRoleAndOrgUnitAsync(dto.Role, dto.OrgUnitId, ct);

        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing is not null)
            throw new UserConflictException($"A user with email '{dto.Email}' already exists.");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            OrgUnitId = dto.OrgUnitId,
        };

        var createResult = await _userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
        {
            // Duplicate emails / usernames surface through Identity error codes.
            if (createResult.Errors.Any(e =>
                    string.Equals(e.Code, "DuplicateEmail", StringComparison.Ordinal) ||
                    string.Equals(e.Code, "DuplicateUserName", StringComparison.Ordinal)))
            {
                throw new UserConflictException($"A user with email '{dto.Email}' already exists.");
            }

            throw new UserValidationException(
                string.Join("; ", createResult.Errors.Select(e => e.Description)));
        }

        var roleResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!roleResult.Succeeded)
        {
            // Roll back the user creation so we don't leave a roleless ghost.
            await _userManager.DeleteAsync(user);
            throw new UserValidationException(
                string.Join("; ", roleResult.Errors.Select(e => e.Description)));
        }

        // Re-load OrgUnit name for the response if applicable.
        string? orgUnitName = null;
        if (user.OrgUnitId is int ouId)
        {
            orgUnitName = await _db.OrgUnits
                .Where(o => o.Id == ouId)
                .Select(o => o.Name)
                .FirstOrDefaultAsync(ct);
        }

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            Role = dto.Role,
            OrgUnitId = user.OrgUnitId,
            OrgUnitName = orgUnitName,
        };
    }

    public async Task<bool> UpdateAsync(string id, UpdateUserDto dto, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
            return false;

        await ValidateRoleAndOrgUnitAsync(dto.Role, dto.OrgUnitId, ct);

        // Replace role membership: remove all current roles, then add the new one.
        var currentRoles = await _userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
                throw new UserValidationException(
                    string.Join("; ", removeResult.Errors.Select(e => e.Description)));
        }

        var addResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!addResult.Succeeded)
            throw new UserValidationException(
                string.Join("; ", addResult.Errors.Select(e => e.Description)));

        user.OrgUnitId = dto.OrgUnitId;
        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new UserValidationException(
                string.Join("; ", updateResult.Errors.Select(e => e.Description)));

        return true;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken ct)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null)
            return false;

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            throw new UserValidationException(
                string.Join("; ", result.Errors.Select(e => e.Description)));

        return true;
    }

    private async Task ValidateRoleAndOrgUnitAsync(string role, int? orgUnitId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(role))
            throw new UserValidationException("Role is required.");

        if (!KnownRoles.Contains(role, StringComparer.Ordinal))
            throw new UserValidationException($"Unknown role '{role}'.");

        // Defensive: make sure the role actually exists in the Identity store
        // (catches misconfigured environments where seed roles weren't applied).
        if (!await _roleManager.RoleExistsAsync(role))
            throw new UserValidationException($"Role '{role}' is not configured.");

        if (RolesRequiringOrgUnit.Contains(role) && orgUnitId is null)
            throw new UserValidationException($"Role '{role}' requires an OrgUnitId.");

        if (orgUnitId is int ouId)
        {
            var exists = await _db.OrgUnits.AnyAsync(o => o.Id == ouId, ct);
            if (!exists)
                throw new UserValidationException($"OrgUnit '{ouId}' does not exist.");
        }
    }

    private static string HighestPrecedenceRole(IList<string> roles)
    {
        // KnownRoles is ordered highest -> lowest precedence; return the first match.
        foreach (var candidate in KnownRoles)
        {
            if (roles.Contains(candidate, StringComparer.Ordinal))
                return candidate;
        }
        return roles.FirstOrDefault() ?? string.Empty;
    }
}
