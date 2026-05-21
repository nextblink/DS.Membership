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
}
