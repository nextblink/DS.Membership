using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Per-operator calling statistics, scoped to the current user. Distinct from
/// <see cref="ICallCenterReportService"/>, which reports campaign-wide,
/// contact-level figures for admins and never reads call attempts.
/// </summary>
public interface IOperatorStatsService
{
    Task<OperatorStatsDto> GetMyStatsAsync(CancellationToken ct);
}
