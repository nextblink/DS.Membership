using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

/// <summary>
/// Seed OrgUnits based on linked Municipalities
/// Each municipality gets a corresponding OrgUnit with the appropriate type
/// </summary>
public static class OrgUnitsSeeder
{
    public static async Task SeedAsync(ApplicationContext context)
    {
        // Get all municipalities
        var municipalities = await context.Municipalities.ToListAsync();

        if (!municipalities.Any())
            return;

        // Delete old seed data (the 3 hardcoded ones)
        var oldOrgUnits = await context.OrgUnits.Where(o => o.Id <= 3).ToListAsync();
        if (oldOrgUnits.Any())
        {
            context.OrgUnits.RemoveRange(oldOrgUnits);
            await context.SaveChangesAsync();
        }

        // Check if we already have the full seeded data
        var existingCount = await context.OrgUnits.CountAsync();
        if (existingCount >= municipalities.Count)
            return;

        var orgUnitsToAdd = new List<OrgUnit>();

        // Create an OrgUnit for each municipality
        foreach (var municipality in municipalities)
        {
            var orgUnit = new OrgUnit
            {
                Name = municipality.Name,
                Type = municipality.IsCity ? OrgUnitType.City : OrgUnitType.Municipal,
                MunicipalityId = municipality.Id,
                ParentId = null, // Will be set in the next pass
                VoterCount = municipality.VoterCount,
                IsTrustful = true,
                CreatedDate = DateTime.UtcNow
            };
            orgUnitsToAdd.Add(orgUnit);
        }

        // Add all OrgUnits first
        context.OrgUnits.AddRange(orgUnitsToAdd);
        await context.SaveChangesAsync();

        // Now establish parent-child relationships based on municipality relationships
        var municipalityLookup = municipalities.ToDictionary(m => m.Id);
        var orgUnitsByMunicipalityId = new Dictionary<int, OrgUnit>();

        foreach (var orgUnit in orgUnitsToAdd)
        {
            if (orgUnit.MunicipalityId.HasValue)
            {
                orgUnitsByMunicipalityId[orgUnit.MunicipalityId.Value] = orgUnit;
            }
        }

        // Link OrgUnit parents to municipality parents
        foreach (var municipality in municipalities.Where(m => m.ParentId.HasValue))
        {
            if (orgUnitsByMunicipalityId.TryGetValue(municipality.Id, out var orgUnit) &&
                orgUnitsByMunicipalityId.TryGetValue(municipality.ParentId.Value, out var parentOrgUnit))
            {
                orgUnit.ParentId = parentOrgUnit.Id;
            }
        }

        await context.SaveChangesAsync();
    }
}
