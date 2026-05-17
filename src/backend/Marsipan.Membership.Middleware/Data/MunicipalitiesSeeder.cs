using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class MunicipalitiesSeeder
{
    private record MunicipalityRecord(
        string Name, bool IsCity, bool HasOo, string? ParentCity, string? PostalCode, int VoterCount);

    public static async Task SeedAsync(ApplicationContext context)
    {
        if (await context.Municipalities.AnyAsync())
            return;

        var records = SeedDataLoader.Load<MunicipalityRecord[]>("municipalities.json");

        var cityLookup = new Dictionary<string, Municipality>();
        var toAdd = new List<Municipality>();

        foreach (var r in records)
        {
            var m = new Municipality
            {
                Name = r.Name,
                IsCity = r.IsCity,
                PostalCode = string.IsNullOrWhiteSpace(r.PostalCode) ? null : r.PostalCode,
                VoterCount = r.VoterCount,
                CreatedDate = DateTime.UtcNow
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
}
