using System.Globalization;
using System.Security.Claims;
using Marsipan.Membership.Middleware.Services;

namespace Marsipan.Membership.Web.Services;

/// <summary>
/// Default <see cref="ICurrentUser"/> implementation backed by
/// <see cref="IHttpContextAccessor"/>. Reads:
/// <list type="bullet">
///   <item><c>sub</c> or <see cref="ClaimTypes.NameIdentifier"/> for the user id</item>
///   <item><c>role</c> / <see cref="ClaimTypes.Role"/> for role(s) — when multiple are present, the highest-precedence one wins</item>
///   <item>custom <c>orgUnitId</c> claim parsed as <see cref="int"/></item>
/// </list>
/// Role precedence (highest -> lowest):
/// SuperAdmin, Admin, LocalAdmin, Operator, Viewer.
/// </summary>
public sealed class CurrentUser : ICurrentUser
{
    private const string OrgUnitClaimType = "orgUnitId";

    // Ordered highest -> lowest. Index 0 wins when multiple roles are present.
    private static readonly string[] RolePrecedence =
    [
        ScopeFilters.RoleSuperAdmin,
        ScopeFilters.RoleAdmin,
        ScopeFilters.RoleLocalAdmin,
        ScopeFilters.RoleOperator,
        ScopeFilters.RoleViewer,
    ];

    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public string? Id
    {
        get
        {
            var principal = Principal;
            if (principal is null)
            {
                return null;
            }

            return principal.FindFirstValue("sub")
                ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }

    public string? Role
    {
        get
        {
            var principal = Principal;
            if (principal is null)
            {
                return null;
            }

            var roleClaims = principal.FindAll(ClaimTypes.Role)
                .Concat(principal.FindAll("role"))
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .ToHashSet(StringComparer.Ordinal);

            if (roleClaims.Count == 0)
            {
                return null;
            }

            foreach (var candidate in RolePrecedence)
            {
                if (roleClaims.Contains(candidate))
                {
                    return candidate;
                }
            }

            // User holds role(s) not in the known precedence list — surface the first
            // so authorization downstream can still see "something" rather than null.
            return roleClaims.First();
        }
    }

    public int? OrgUnitId
    {
        get
        {
            var raw = Principal?.FindFirstValue(OrgUnitClaimType);
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
                ? value
                : null;
        }
    }
}
