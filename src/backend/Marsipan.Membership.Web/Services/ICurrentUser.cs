using Marsipan.Membership.Middleware.Services;

namespace Marsipan.Membership.Web.Services;

/// <summary>
/// Web-layer accessor for the current authenticated user, sourced from JWT
/// claims on <c>HttpContext.User</c>. Extends <see cref="ICurrentUserContext"/>
/// so Middleware-layer helpers (e.g. <c>ScopeFilters</c>) can consume the
/// same instance without a reverse dependency on the Web project.
/// </summary>
public interface ICurrentUser : ICurrentUserContext
{
}
