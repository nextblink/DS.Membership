using System.Globalization;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class CallContactImportService : ICallContactImportService
{
    // Maps a previous campaign's recorded outcome onto this app's CallOutcome/ContactFinalStatus,
    // so contacts already resolved in the prior campaign don't re-enter the operator call queue
    // (GetNextForOperatorAsync only surfaces null-or-NoAnswer LastOutcome). Unlisted / unknown
    // values are left unmapped (no outcome, still fully "fresh" to call).
    private static readonly Dictionary<string, (CallOutcome Outcome, ContactFinalStatus? Status)> PreviousOutcomeMap =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["DA"] = (CallOutcome.ValidContact, ContactFinalStatus.ActiveMember),
            ["SIMPATIZER"] = (CallOutcome.ValidContact, ContactFinalStatus.Sympathizer),
            ["NE"] = (CallOutcome.Refused, ContactFinalStatus.NoCooperation),
            ["NIJE_DOBAR_BROJ"] = (CallOutcome.WrongNumber, null),
            ["NIJE_DOBIJENO"] = (CallOutcome.NoAnswer, null),
            ["POZVATI_PONOVO"] = (CallOutcome.NoAnswer, null),
            ["NEPOZVANO"] = (CallOutcome.NoAnswer, null),
        };

    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public CallContactImportService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    private sealed record RawRow(string? FirstName, string? LastName, string? Phone,
        string? Email, string? Address, string? City, string? Municipality,
        string? Phone2, string? Jmbg, string? PreviousOutcome, string? Comment, string? MemberSince);

    public async Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default)
    {
        var campaignExists = await _db.Campaigns.AnyAsync(c => c.Id == campaignId, ct);
        if (!campaignExists) throw new KeyNotFoundException($"Campaign {campaignId} not found.");

        var rows = fileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)
            ? ReadXlsx(file)
            : ReadCsv(file);

        // Municipality names are stored in Serbian Cyrillic; import files commonly use Latin
        // script, so index both forms (case-insensitively) against the same Id.
        var municipalityIdsByName = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var municipalities = await _db.Municipalities.Select(m => new { m.Id, m.Name }).ToListAsync(ct);
        foreach (var m in municipalities)
        {
            municipalityIdsByName[m.Name] = m.Id;
            municipalityIdsByName[SerbianTransliteration.ToLatin(m.Name)] = m.Id;
        }

        var errors = new List<string>();
        var now = DateTime.UtcNow;
        var uid = _user.Id ?? "system";
        var toAdd = new List<CallContact>();
        int line = 1;

        foreach (var r in rows)
        {
            line++;
            if (string.IsNullOrWhiteSpace(r.FirstName) ||
                string.IsNullOrWhiteSpace(r.LastName))
            {
                errors.Add($"Row {line}: missing FirstName or LastName — skipped.");
                continue;
            }

            int? municipalityId = null;
            if (!string.IsNullOrWhiteSpace(r.Municipality) &&
                municipalityIdsByName.TryGetValue(r.Municipality.Trim(), out var mid))
            {
                municipalityId = mid;
            }

            // Comment + MemberSince fold into a single free-text ImportNote (kept for audit/
            // display of the original source row), while MemberSince is also parsed into a
            // structured date below so it can be queried/displayed without re-parsing text.
            string? importNote = null;
            if (!string.IsNullOrWhiteSpace(r.Comment) && !string.IsNullOrWhiteSpace(r.MemberSince))
                importNote = $"{r.Comment.Trim()} (MemberSince: {r.MemberSince.Trim()})";
            else if (!string.IsNullOrWhiteSpace(r.Comment))
                importNote = r.Comment.Trim();
            else if (!string.IsNullOrWhiteSpace(r.MemberSince))
                importNote = $"MemberSince: {r.MemberSince.Trim()}";

            DateOnly? memberSince = null;
            if (!string.IsNullOrWhiteSpace(r.MemberSince) &&
                DateOnly.TryParseExact(r.MemberSince.Trim(), "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedMemberSince))
            {
                memberSince = parsedMemberSince;
            }

            var previousOutcome = string.IsNullOrWhiteSpace(r.PreviousOutcome) ? null : r.PreviousOutcome!.Trim();
            var mapped = previousOutcome is not null && PreviousOutcomeMap.TryGetValue(previousOutcome, out var m) ? m : ((CallOutcome, ContactFinalStatus?)?)null;

            toAdd.Add(new CallContact
            {
                FirstName = r.FirstName!.Trim(),
                LastName = r.LastName!.Trim(),
                PhoneNumber = string.IsNullOrWhiteSpace(r.Phone) ? null : r.Phone!.Trim(),
                SecondaryPhone = string.IsNullOrWhiteSpace(r.Phone2) ? null : r.Phone2!.Trim(),
                Jmbg = string.IsNullOrWhiteSpace(r.Jmbg) ? null : r.Jmbg!.Trim(),
                Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email!.Trim(),
                Address = string.IsNullOrWhiteSpace(r.Address) ? null : r.Address!.Trim(),
                City = string.IsNullOrWhiteSpace(r.City) ? null : r.City!.Trim(),
                MunicipalityId = municipalityId,
                ImportedOutcome = previousOutcome,
                ImportNote = importNote,
                MemberSince = memberSince,
                AttemptCount = mapped is not null ? 1 : 0,
                LastCalledAt = mapped is not null ? now : null,
                LastOutcome = mapped?.Item1,
                FinalStatus = mapped?.Item2,
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
                Get(csv, "email"), Get(csv, "address"), Get(csv, "city"), Get(csv, "municipality"),
                Get(csv, "phone2"), Get(csv, "jmbg"), Get(csv, "previousoutcome"),
                Get(csv, "comment"), Get(csv, "membersince")));
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
                Cell(row, map, "Municipality"), Cell(row, map, "Phone2"), Cell(row, map, "Jmbg"),
                Cell(row, map, "PreviousOutcome"), Cell(row, map, "Comment"), Cell(row, map, "MemberSince")));
        }
        return rows;

        static string? Cell(IXLRangeRow row, Dictionary<string, int> map, string name)
            => map.TryGetValue(name, out var col) ? row.Cell(col).GetString() : null;
    }
}
