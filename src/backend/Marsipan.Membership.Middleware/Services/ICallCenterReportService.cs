using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallCenterReportService
{
    Task<CallCenterReportDto> GetReportAsync(CallCenterReportQuery query, CancellationToken ct = default);

    // The same report as a comma-separated, Serbian-labelled CSV: metric block, engagement
    // areas, then every matching suggestion (not just the page the UI shows).
    Task<string> ExportCsvAsync(CallCenterReportQuery query, CancellationToken ct = default);
}
