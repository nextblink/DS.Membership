using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class CommitteesSeeder
{
    private record MunicipalityHint(string Name, bool HasOo);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        var municipalities = await context.Municipalities.ToListAsync();
        if (!municipalities.Any()) return;

        // Remove any legacy hardcoded org units (ids 1-3) if still present.
        var legacy = await context.Committees.Where(o => o.Id <= 3).ToListAsync();
        if (legacy.Any())
        {
            context.Committees.RemoveRange(legacy);
            await context.SaveChangesAsync();
        }

        var existingCount = await context.Committees.CountAsync();
        // +3 for the three national bodies seeded below
        if (existingCount >= municipalities.Count + 3) return;

        // Load hasOo hint from JSON (not stored on entity).
        var hints = SeedDataLoader.Load<MunicipalityHint[]>("municipalities.json")
            .ToDictionary(h => h.Name, h => h.HasOo);

        var toAdd = new List<Committee>();
        var now = DateTime.UtcNow;

        foreach (var m in municipalities)
        {
            var hasOo = hints.GetValueOrDefault(m.Name, true);

            if (hasOo)
            {
                toAdd.Add(new Committee
                {
                    Name = m.IsCity ? $"{m.Name} ГРО" : $"{m.Name} ОО",
                    Type = m.IsCity ? CommitteeType.City : CommitteeType.Municipal,
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

        context.Committees.AddRange(toAdd);
        await context.SaveChangesAsync();

        var municipalityById = municipalities.ToDictionary(m => m.Id);
        var orgUnitsByMunicipalityId = toAdd
            .GroupBy(o => o.MunicipalityId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        // Set Municipality.OoId to the newly created OO unit for each municipality.
        foreach (var m in municipalities)
        {
            if (!orgUnitsByMunicipalityId.TryGetValue(m.Id, out var units)) continue;
            var ooUnit = units.FirstOrDefault(u => u.Type == CommitteeType.Municipal);
            if (ooUnit != null) m.OoId = ooUnit.Id;
        }

        // Wire up parent Committee relationships following municipality hierarchy.
        foreach (var m in municipalities.Where(m => m.ParentId.HasValue))
        {
            if (!orgUnitsByMunicipalityId.TryGetValue(m.Id, out var childUnits)) continue;
            if (!municipalityById.TryGetValue(m.ParentId!.Value, out var parentMunicipality)) continue;
            if (!orgUnitsByMunicipalityId.TryGetValue(parentMunicipality.Id, out var parentUnits)) continue;

            var parentUnit = parentUnits.FirstOrDefault(u => u.Type == CommitteeType.City)
                          ?? parentUnits.FirstOrDefault();

            if (parentUnit != null)
                foreach (var child in childUnits)
                    child.ParentId = parentUnit.Id;
        }

        await context.SaveChangesAsync();

        // Seed 3 national bodies (no municipality, no parent, no voter count).
        var hasNational = await context.Committees
            .AnyAsync(o => o.Type == CommitteeType.MainCommittee);

        if (!hasNational)
        {
            context.Committees.AddRange(
                new Committee { Name = "Главни одбор",  Type = CommitteeType.MainCommittee,      MaxMembers = 150, IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId },
                new Committee { Name = "Извршни одбор", Type = CommitteeType.ExecutiveCommittee, MaxMembers = 10,  IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId },
                new Committee { Name = "Председништво", Type = CommitteeType.Presidency,         MaxMembers = 10,  IsTrustful = true, VoterCount = 0, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId }
            );
            await context.SaveChangesAsync();
        }
    }
}
