namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Minimal abstraction over the current authenticated principal, exposed to the
/// Middleware layer so it can be referenced by data-scoping helpers without
/// taking a dependency on the Web project / <c>HttpContext</c>.
/// </summary>
/// <remarks>
/// The Web layer implements this via <c>ICurrentUser</c> (which reads claims
/// from <c>IHttpContextAccessor</c>). Tests can supply a trivial stub.
/// </remarks>
public interface ICurrentUserContext
{
    /// <summary>The user id (from the <c>sub</c> / <c>NameIdentifier</c> claim), or null when unauthenticated.</summary>
    string? Id { get; }

    /// <summary>The highest-precedence role name (see <c>ScopeFilters</c> for precedence), or null when unauthenticated/no role.</summary>
    string? Role { get; }

    /// <summary>The committee id (from the custom <c>orgUnitId</c> claim), or null when not set.</summary>
    int? CommitteeId { get; }

    /// <summary>True when the request carries an authenticated principal.</summary>
    bool IsAuthenticated { get; }
}
