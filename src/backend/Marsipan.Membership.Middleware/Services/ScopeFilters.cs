using Marsipan.Membership.Middleware.Entities;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Row-level scope filters for Members and Forms, applied based on the caller's role.
/// </summary>
/// <remarks>
/// <para>
/// <b>Role precedence (highest -> lowest):</b>
/// <c>SuperAdmin</c>, <c>Admin</c>, <c>LocalAdmin</c>, <c>Operator</c>, <c>Viewer</c>.
/// The "highest" role a user holds determines which scope is applied; resolution
/// of that role from the principal's claims is performed by the Web-layer
/// <c>ICurrentUser</c> implementation before reaching these helpers.
/// </para>
/// <para>
/// <b>Empty-result rule:</b> when a restricted role (anything other than
/// <c>SuperAdmin</c> / <c>Admin</c>) is bound to no <c>CommitteeId</c>, the
/// applicable scope cannot be evaluated safely. Rather than silently returning
/// all rows, the helpers return an empty <see cref="IQueryable{T}"/>
/// (<c>q.Where(_ =&gt; false)</c>). The same rule applies to an unauthenticated
/// caller; in practice authentication middleware should have rejected the
/// request before this point, but the filters fail closed defensively.
/// </para>
/// <para>
/// These helpers are pure over <see cref="IQueryable{T}"/> and unit-testable
/// against an in-memory provider; supply a fake <see cref="ICurrentUserContext"/>
/// to verify each role's effective query.
/// </para>
/// </remarks>
public static class ScopeFilters
{
    // Role name constants — kept here (rather than imported from Identity)
    // so Middleware has no dependency on ASP.NET Core Identity role plumbing.
    public const string RoleSuperAdmin = "SuperAdmin";
    public const string RoleAdmin = "Admin";
    public const string RoleLocalAdmin = "LocalAdmin";
    public const string RoleOperator = "Operator";
    public const string RoleViewer = "Viewer";

    /// <summary>
    /// Restricts a Members query to the rows the caller is allowed to see.
    /// SuperAdmin/Admin see everything; all other roles are scoped to their
    /// <c>CommitteeId</c>; missing <c>CommitteeId</c> yields an empty result.
    /// </summary>
    public static IQueryable<Member> ApplyMemberScope(this IQueryable<Member> q, ICurrentUserContext user)
    {
        ArgumentNullException.ThrowIfNull(q);
        ArgumentNullException.ThrowIfNull(user);

        if (!user.IsAuthenticated)
        {
            return q.Where(_ => false);
        }

        if (IsUnrestricted(user.Role))
        {
            return q;
        }

        if (user.CommitteeId is null)
        {
            return q.Where(_ => false);
        }

        var orgUnitId = user.CommitteeId.Value;
        return q.Where(m => m.CommitteeId == orgUnitId);
    }

    /// <summary>
    /// Restricts a Forms query to the rows the caller is allowed to see.
    /// SuperAdmin/Admin see everything; Operator sees forms they created;
    /// every other restricted role sees forms whose linked Member belongs
    /// to their <c>CommitteeId</c>. Missing required claim yields an empty
    /// result.
    /// </summary>
    public static IQueryable<Form> ApplyFormScope(this IQueryable<Form> q, ICurrentUserContext user)
    {
        ArgumentNullException.ThrowIfNull(q);
        ArgumentNullException.ThrowIfNull(user);

        if (!user.IsAuthenticated)
        {
            return q.Where(_ => false);
        }

        if (IsUnrestricted(user.Role))
        {
            return q;
        }

        if (string.Equals(user.Role, RoleOperator, StringComparison.Ordinal))
        {
            if (string.IsNullOrEmpty(user.Id))
            {
                return q.Where(_ => false);
            }

            var userId = user.Id;
            return q.Where(f => f.CreatedByUserId == userId);
        }

        if (user.CommitteeId is null)
        {
            return q.Where(_ => false);
        }

        var orgUnitId = user.CommitteeId.Value;
        return q.Where(f => f.Member!.CommitteeId == orgUnitId);
    }

    /// <summary>
    /// Restricts a CallContact query to the rows the caller may see.
    /// SuperAdmin/Admin see everything; Operators see only contacts in pools
    /// they are assigned to (via CallPoolOperator); every other restricted role
    /// sees nothing. Unauthenticated callers get an empty result.
    /// </summary>
    public static IQueryable<CallContact> ApplyCallContactScope(
        this IQueryable<CallContact> q,
        ICurrentUserContext user)
    {
        ArgumentNullException.ThrowIfNull(q);
        ArgumentNullException.ThrowIfNull(user);

        if (!user.IsAuthenticated)
        {
            return q.Where(_ => false);
        }

        if (IsUnrestricted(user.Role))
        {
            return q;
        }

        if (string.Equals(user.Role, RoleOperator, StringComparison.Ordinal))
        {
            if (string.IsNullOrEmpty(user.Id))
            {
                return q.Where(_ => false);
            }

            var userId = user.Id;
            return q.Where(c => c.PoolId != null
                && c.Pool!.Operators.Any(o => o.UserId == userId));
        }

        // LocalAdmin / Viewer / anything else: call center is not scoped by
        // committee, so restricted non-operator roles see nothing.
        return q.Where(_ => false);
    }

    private static bool IsUnrestricted(string? role) =>
        string.Equals(role, RoleSuperAdmin, StringComparison.Ordinal) ||
        string.Equals(role, RoleAdmin, StringComparison.Ordinal);
}
