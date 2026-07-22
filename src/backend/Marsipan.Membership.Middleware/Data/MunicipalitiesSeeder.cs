using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class MunicipalitiesSeeder
{
    private record MunicipalityRecord(
        string Name, bool IsCity, bool HasOo, string? ParentCity, string? PostalCode, int VoterCount,
        double? Lat = null, double? Lng = null);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        if (await context.Municipalities.AnyAsync())
            return;

        var records = SeedDataLoader.Load<MunicipalityRecord[]>("municipalities.json");

        var cityLookup = new Dictionary<string, Municipality>();
        var toAdd = new List<Municipality>();
        var now = DateTime.UtcNow;

        foreach (var r in records)
        {
            var m = new Municipality
            {
                Name = r.Name,
                IsCity = r.IsCity,
                PostalCode = string.IsNullOrWhiteSpace(r.PostalCode) ? null : r.PostalCode,
                VoterCount = r.VoterCount,
                Lat = r.Lat,
                Lng = r.Lng,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = systemUserId,
                LastModifiedByUserId = systemUserId
            };
            toAdd.Add(m);
            if (r.IsCity) cityLookup[r.Name] = m;
        }

        context.Municipalities.AddRange(toAdd);
        await context.SaveChangesAsync();

        foreach (var r in records.Where(r => !r.IsCity && r.ParentCity != null))
        {
            if (cityLookup.TryGetValue(r.ParentCity!, out var parent))
            {
                var m = await context.Municipalities.FirstOrDefaultAsync(x => x.Name == r.Name && !x.IsCity);
                if (m != null) m.ParentId = parent.Id;
            }
        }

        await context.SaveChangesAsync();
    }

    // Patches Lat/Lng on existing rows that were seeded before coordinates were added.
    public static async Task PatchCoordinatesAsync(ApplicationContext context)
    {
        var needsPatch = await context.Municipalities.AnyAsync(m => m.Lat == null);
        if (!needsPatch) return;

        var records = SeedDataLoader.Load<MunicipalityRecord[]>("municipalities.json");
        var coordMap = records
            .Where(r => r.Lat.HasValue && r.Lng.HasValue)
            .ToDictionary(r => r.Name, r => (r.Lat!.Value, r.Lng!.Value));

        var municipalities = await context.Municipalities.ToListAsync();
        foreach (var m in municipalities)
        {
            if (m.Lat.HasValue) continue;
            if (coordMap.TryGetValue(m.Name, out var coords))
            {
                m.Lat = coords.Item1;
                m.Lng = coords.Item2;
            }
        }

        await context.SaveChangesAsync();
    }

    // Inserts municipalities present in municipalities.json but absent from an already-seeded DB
    // (e.g. new municipalities added after the initial seed ran, such as APV entries #76).
    // Also covers the case where a seed record was previously loaded under a misspelled name:
    // if a record's name isn't found but its (unique) postal code matches an existing row,
    // that row is corrected in place instead of inserting a duplicate. Safe to call on every startup.
    public static async Task PatchMissingMunicipalitiesAsync(ApplicationContext context, string systemUserId)
    {
        var records = SeedDataLoader.Load<MunicipalityRecord[]>("municipalities.json");

        var existingByName = await context.Municipalities.ToDictionaryAsync(m => m.Name);
        var missing = records.Where(r => !existingByName.ContainsKey(r.Name)).ToList();
        if (missing.Count == 0)
            return;

        var existingByPostalCode = existingByName.Values
            .Where(m => !string.IsNullOrWhiteSpace(m.PostalCode))
            .GroupBy(m => m.PostalCode!)
            .Where(g => g.Count() == 1)
            .ToDictionary(g => g.Key, g => g.Single());

        var now = DateTime.UtcNow;
        var inserted = new List<(Municipality Municipality, MunicipalityRecord Record)>();

        foreach (var r in missing)
        {
            if (!string.IsNullOrWhiteSpace(r.PostalCode)
                && existingByPostalCode.TryGetValue(r.PostalCode, out var existing)
                && existing.IsCity == r.IsCity)
            {
                // Same municipality, previously seeded under a different (misspelled) name — fix in place.
                existing.Name = r.Name;
                existing.VoterCount = r.VoterCount;
                existing.Lat = r.Lat;
                existing.Lng = r.Lng;
                existing.LastModifiedDate = now;
                existing.LastModifiedByUserId = systemUserId;
                existingByName[r.Name] = existing;
                continue;
            }

            var m = new Municipality
            {
                Name = r.Name,
                IsCity = r.IsCity,
                PostalCode = string.IsNullOrWhiteSpace(r.PostalCode) ? null : r.PostalCode,
                VoterCount = r.VoterCount,
                Lat = r.Lat,
                Lng = r.Lng,
                CreatedDate = now,
                LastModifiedDate = now,
                CreatedByUserId = systemUserId,
                LastModifiedByUserId = systemUserId
            };
            context.Municipalities.Add(m);
            existingByName[r.Name] = m;
            inserted.Add((m, r));
        }

        await context.SaveChangesAsync();

        foreach (var (m, r) in inserted)
        {
            if (r.IsCity || r.ParentCity == null)
                continue;
            if (existingByName.TryGetValue(r.ParentCity, out var parent))
                m.ParentId = parent.Id;
        }

        await context.SaveChangesAsync();
    }
}
