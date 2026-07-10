using System.Globalization;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallContactImportService : ICallContactImportService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallContactImportService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    private sealed record RawRow(string? FirstName, string? LastName, string? Phone,
        string? Email, string? Address, string? City, string? Municipality);

    public async Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
    {
        var campaignExists = await _db.Campaigns.AnyAsync(c => c.Id == campaignId, ct);
        if (!campaignExists) throw new KeyNotFoundException($"Campaign {campaignId} not found.");

        var rows = fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)
            ? ReadXlsx(file)
            : ReadCsv(file);

        var municipalityIdsByName = await _db.Municipalities
            .ToDictionaryAsync(m => m.Name, m => m.Id, StringComparer.OrdinalIgnoreCase, ct);

        var errors = new List<string>();
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var toAdd = new List<CallContact>();
        int line = 1;

        foreach (var r in rows)
        {
            line++;
            if (string.IsNullOrWhiteSpace(r.FirstName) ||
                string.IsNullOrWhiteSpace(r.LastName) ||
                string.IsNullOrWhiteSpace(r.Phone))
            {
                errors.Add($"Row {line}: missing FirstName, LastName, or Phone — skipped.");
                continue;
            }

            int? municipalityId = null;
            if (!string.IsNullOrWhiteSpace(r.Municipality) &&
                municipalityIdsByName.TryGetValue(r.Municipality.Trim(), out var mid))
            {
                municipalityId = mid;
            }

            toAdd.Add(new CallContact
            {
                FirstName = r.FirstName!.Trim(),
                LastName = r.LastName!.Trim(),
                PhoneNumber = r.Phone!.Trim(),
                Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email!.Trim(),
                Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address!.Trim(),
                City = string.IsNullOrWhiteSpace(r.City) ? null : r.City!.Trim(),
                MunicipalityId = municipalityId,
                CampaignId = campaignId,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = uid,
                LastModifiedByUserId = uid
            });
        }

        _db.CallContacts.AddRange(toAdd);
        await _db.SaveChangesAsync(ct);

        return new ImportResultDto(toAdd.Count, errors.Count, errors);
    }

    private static List<RawRow> ReadCsv(Stream file)
    {
        using var reader = new StreamReader(file);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            PrepareHeaderForMatch = a => a.Header.Trim().ToLowerInvariant()
        });
        if (!csv.Read())
        {
            return new List<RawRow>();
        }
        csv.ReadHeader();
        var rows = new List<RawRow>();
        while (csv.Read())
        {
            rows.Add(new RawRow(
                Get(csv, "firstname"), Get(csv, "lastname"), Get(csv, "phone"),
                Get(csv, "email"), Get(csv, "address"), Get(csv, "city"), Get(csv, "municipality")));
        }
        return rows;

        static string? Get(CsvReader c, string name)
            => c.TryGetField<string>(name, out var v) ? v : null;
    }

    private static List<RawRow> ReadXlsx(Stream file)
    {
        using var wb = new XLWorkbook(file);
        var ws = wb.Worksheets.First();
        var rowsUsed = ws.RangeUsed()?.RowsUsed().ToList() ?? new();
        if (rowsUsed.Count == 0) return new();

        // Header row → column index map (case-insensitive).
        var header = rowsUsed[0];
        var map = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var cell in header.Cells())
            map[cell.GetString().Trim()] = cell.Address.ColumnNumber;

        var rows = new List<RawRow>();
        foreach (var row in rowsUsed.Skip(1))
        {
            rows.Add(new RawRow(
                Cell(row, map, "FirstName"), Cell(row, map, "LastName"), Cell(row, map, "Phone"),
                Cell(row, map, "Email"), Cell(row, map, "Address"), Cell(row, map, "City"),
                Cell(row, map, "Municipality")));
        }
        return rows;

        static string? Cell(IXLRangeRow row, Dictionary<string, int> map, string name)
            => map.TryGetValue(name, out var col) ? row.Cell(col).GetString() : null;
    }
}
