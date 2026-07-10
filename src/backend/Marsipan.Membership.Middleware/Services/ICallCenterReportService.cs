using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallCenterReportService
{
    Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default);
}
