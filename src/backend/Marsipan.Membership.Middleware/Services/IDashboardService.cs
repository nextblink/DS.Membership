using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Computes the dashboard stats payload (totals, members-by-OrgUnit with
/// %, and forms-by-status). Implementations are expected to apply role-based
/// scope using <see cref="ICurrentUserContext"/>.
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// Returns aggregate dashboard stats for the current caller.
    /// </summary>
    /// <remarks>
    /// Scope:
    /// <list type="bullet">
    ///   <item>SuperAdmin / Admin: all OrgUnits, all forms.</item>
    ///   <item>LocalAdmin: only the caller's own OrgUnit (totals reflect that unit only).</item>
    ///   <item>Viewer / Operator: not allowed at the controller layer; behaviour is undefined here.</item>
    /// </list>
    /// Soft-deleted members and forms are excluded via the DbContext query filter.
    /// </remarks>
    Task<DashboardStatsDto> GetStatsAsync(CancellationToken ct = default);
}
