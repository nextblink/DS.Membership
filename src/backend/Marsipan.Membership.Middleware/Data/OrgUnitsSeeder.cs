using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class OrgUnitsSeeder
{
    private record MunicipalityHint(string Name, bool HasOo);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        var municipalities = await context.Municipalities.ToListAsync();
        if (!municipalities.Any()) return;

        // Remove any legacy hardcoded org units (ids 1-3) if still present.
        var legacy = await context.OrgUnits.Where(o => o.Id <= 3).ToListAsync();
        if (legacy.Any())
        {
            context.OrgUnits.RemoveRange(legacy);
            await context.SaveChangesAsync();
        }

        var existingCount = await context.OrgUnits.CountAsync();
        // +3 for the three national bodies seeded below
        if (existingCount >= municipalities.Count + 3) return;

        // Load hasOo hint from JSON (not stored on entity).
        var hints = SeedDataLoader.Load<MunicipalityHint[]>("municipalities.json")
            .ToDictionary(h => h.Name, h => h.HasOo);

        var toAdd = new List<OrgUnit>();
        var now = DateTime.UtcNow;

        foreach (var m in municipalities)
        {
            var hasOo = hints.GetValueOrDefault(m.Name, true);

            if (m.IsCity)
            {
                toAdd.Add(new OrgUnit
                {
                    Name = $"{m.Name} ГРО",
                    Type = OrgUnitType.City,
                    MunicipalityId = m.Id,
                    VoterCount = m.VoterCount,
                    IsTrustful = true,
                    CreatedDate = now,
                    LastModifiedDate = now,
                    CreatedByUserId = systemUserId,
                    LastModifiedByUserId = systemUserId
                });
            }

            if (hasOo)
            {
                toAdd.Add(new OrgUnit
                {
                    Name = $"{m.Name} ОО",
                    Type = OrgUnitType.Municipal,
                    MunicipalityId = m.Id,
                    VoterCount = m.VoterCount,
                    IsTrustful = true,
                    CreatedDate = now,
                    LastModifiedDate = now,
                    CreatedByUserId = systemUserId,
                    LastModifiedByUserId = systemUserId
                });
            }
        }

        context.OrgUnits.AddRange(toAdd);
        await context.SaveChangesAsync();

        var municipalityById = municipalities.ToDictionary(m => m.Id);
        var orgUnitsByMunicipalityId = toAdd
            .GroupBy(o => o.MunicipalityId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Set Municipality.OoId to the newly created OO unit for each municipality.
        foreach (var m in municipalities)
        {
            if (!orgUnitsByMunicipalityId.TryGetValue(m.Id, out var units)) continue;
            var ooUnit = units.FirstOrDefault(u => u.Type == OrgUnitType.Municipal);
            if (ooUnit != null) m.OoId = ooUnit.Id;
        }

        // Wire up parent OrgUnit relationships following municipality hierarchy.
        foreach (var m in municipalities.Where(m => m.ParentId.HasValue))
        {
            if (!orgUnitsByMunicipalityId.TryGetValue(m.Id, out var childUnits)) continue;
            if (!municipalityById.TryGetValue(m.ParentId!.Value, out var parentMunicipality)) continue;
            if (!orgUnitsByMunicipalityId.TryGetValue(parentMunicipality.Id, out var parentUnits)) continue;

            var parentUnit = parentUnits.FirstOrDefault(u => u.Type == OrgUnitType.City)
                          ?? parentUnits.FirstOrDefault();

            if (parentUnit != null)
                foreach (var child in childUnits)
                    child.ParentId = parentUnit.Id;
        }

        await context.SaveChangesAsync();

        // Seed 3 national bodies (no municipality, no parent, no voter count).
        var hasNational = await context.OrgUnits
            .AnyAsync(o => o.Type == OrgUnitType.MainCommittee);

        if (!hasNational)
        {
            context.OrgUnits.AddRange(
                new OrgUnit { Name = "Главни одбор",  Type = OrgUnitType.MainCommittee,      MaxMembers = 150, IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId },
                new OrgUnit { Name = "Извршни одбор", Type = OrgUnitType.ExecutiveCommittee, MaxMembers = 10,  IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId },
                new OrgUnit { Name = "Председништво", Type = OrgUnitType.Presidency,         MaxMembers = 10,  IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId }
            );
            await context.SaveChangesAsync();
        }
    }
}
