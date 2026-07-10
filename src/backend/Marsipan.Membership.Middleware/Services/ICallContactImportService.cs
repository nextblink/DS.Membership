using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallContactImportService
{
    /// <summary>
    /// Parses a CSV or XLSX lead list and bulk-inserts contacts into the campaign.
    /// Expected columns (header row, case-insensitive): FirstName, LastName, Phone,
    /// Email, Address, City, Municipality. FirstName+LastName+Phone are required;
    /// rows missing any are skipped and reported.
    /// </summary>
    Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default);
}
