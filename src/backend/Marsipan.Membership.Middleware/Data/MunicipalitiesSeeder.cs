using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

/// <summary>
/// Seed data for municipalities from DS_Odbori_Srbija.xlsx
/// Structure: Cities are top-level, some municipalities are children of cities
/// </summary>
public static class MunicipalitiesSeeder
{
    public static async Task SeedAsync(ApplicationContext context)
    {
        // Check if data already exists
        if (await context.Municipalities.AnyAsync())
            return;

        var municipalitiesData = GetMunicipalitiesData();

        // Create a lookup for cities by name to establish parent-child relationships
        var cityLookup = new Dictionary<string, Municipality>();
        var municipalitiesToAdd = new List<Municipality>();

        // First pass: Create all municipalities
        foreach (var data in municipalitiesData)
        {
            var municipality = new Municipality
            {
                Name = data.Name,
                IsCity = data.IsCity,
                VoterCount = data.VoterCount,
                ParentId = null,
                CreatedDate = DateTime.UtcNow
            };
            municipalitiesToAdd.Add(municipality);

            if (data.IsCity)
            {
                cityLookup[data.Name] = municipality;
            }
        }

        // Add all municipalities to context
        context.Municipalities.AddRange(municipalitiesToAdd);
        await context.SaveChangesAsync();

        // Second pass: Update parent-child relationships
        foreach (var data in municipalitiesData)
        {
            if (!data.IsCity && data.ParentCity != null && cityLookup.TryGetValue(data.ParentCity, out var parentCity))
            {
                var municipality = await context.Municipalities
                    .FirstOrDefaultAsync(m => m.Name == data.Name && !m.IsCity);

                if (municipality != null)
                {
                    municipality.ParentId = parentCity.Id;
                }
            }
        }

        await context.SaveChangesAsync();
    }

    private static List<(string Name, bool IsCity, string? ParentCity, int VoterCount)> GetMunicipalitiesData()
    {
        return new List<(string, bool, string?, int)>
        {
            // Cities (GRO - Gradski odbor) with voter counts
            ("Beograd", true, null, 1613190),
            ("Novi Sad", true, null, 337290),
            ("Niš", true, null, 228491),
            ("Kragujevac", true, null, 154897),
            ("Čačak", true, null, 95000),
            ("Valjevo", true, null, 85000),
            ("Subotica", true, null, 110000),
            ("Zrenjanin", true, null, 100000),
            ("Leskovac", true, null, 105000),
            ("Vranje", true, null, 92000),
            ("Pančevo", true, null, 110000),
            ("Sombor", true, null, 75000),
            ("Loznica", true, null, 65000),
            ("Smederevo", true, null, 80000),
            ("Sremska Mitrovica", true, null, 82000),
            ("Užice", true, null, 60000),
            ("Vršac", true, null, 68000),
            ("Zaječar", true, null, 58000),
            ("Pažarevac", true, null, 70000),
            ("Kikinda", true, null, 55000),
            ("Šabac", true, null, 75000),
            ("Čuprija", true, null, 50000),

            // Municipal units (OO - Opštinski odbor) with estimated voter counts
            ("Ada", false, null, 12000),
            ("Aleksinac", false, null, 22000),
            ("Alibunar", false, null, 15000),
            ("Apatin", false, null, 18000),
            ("Arandjelovac", false, null, 25000),
            ("Barajevo", false, null, 8000),
            ("Bač", false, null, 14000),
            ("Bačka Palanka", false, null, 38000),
            ("Bačka Topola", false, null, 16000),
            ("Beoćin", false, null, 12000),
            ("Bečej", false, null, 20000),
            ("Bor", false, null, 28000),
            ("Grocka", false, null, 18000),
            ("Inđija", false, null, 32000),
            ("Irig", false, null, 9000),
            ("Kanjiža", false, null, 13000),
            ("Knić", false, null, 8000),
            ("Kovačica", false, null, 14000),
            ("Kovin", false, null, 16000),
            ("Kula", false, null, 15000),
            ("Lazarevac", false, "Beograd", 42000),
            ("Mali Iđoš", false, null, 10000),
            ("Mladenovac", false, null, 28000),
            ("Nova Crnja", false, null, 9000),
            ("Novi Beograd", false, "Beograd", 65000),
            ("Novi Bečej", false, null, 14000),
            ("Novi Kneževac", false, null, 11000),
            ("Obrenovac", false, "Beograd", 32000),
            ("Odžaci", false, null, 20000),
            ("Opovo", false, null, 8000),
            ("Palilula", false, "Beograd", 120000),
            ("Pećinci", false, null, 12000),
            ("Plandište", false, null, 7000),
            ("Rakovica", false, "Beograd", 70000),
            ("Rekovac", false, null, 6000),
            ("Ruma", false, null, 35000),
            ("Savski Venac", false, "Beograd", 85000),
            ("Senta", false, null, 11000),
            ("Sečanj", false, null, 12000),
            ("Sokobanja", false, null, 10000),
            ("Sopot", false, null, 12000),
            ("Sremski Karlovci", false, null, 8000),
            ("Stara Pazova", false, null, 45000),
            ("Stari Grad", false, "Beograd", 60000),
            ("Surčin", false, "Beograd", 35000),
            ("Temerin", false, null, 17000),
            ("Titel", false, null, 9000),
            ("Voždovac", false, "Beograd", 95000),
            ("Vračar", false, "Beograd", 75000),
            ("Vrbas", false, null, 16000),
            ("Čoka", false, null, 7000),
            ("Čukarica", false, "Beograd", 110000),
            ("Šid", false, null, 18000),
            ("Žabalj", false, null, 14000),
            ("Zemun", false, null, 52000),
            ("Zvezdara", false, "Beograd", 95000),
        };
    }
}
