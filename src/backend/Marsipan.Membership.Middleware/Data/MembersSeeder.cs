using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class MembersSeeder
{
    private static readonly Random Rng = new();

    private record NamesData(
        string[] FirstNamesMale, string[] FirstNamesFemale, string[] LastNames,
        string[] ParentNames, string[] CompanyPrefixes, string[] CompanySuffixes,
        string[] JobTitles, string[] Occupations);

    public static async Task SeedAsync(ApplicationContext context, string systemUserId)
    {
        if (await context.Members.AnyAsync()) return;

        var orgUnits  = await context.OrgUnits.ToListAsync();
        var functions = await context.Functions.ToListAsync();
        if (!orgUnits.Any() || !functions.Any()) return;

        var names = SeedDataLoader.Load<NamesData>("member-names.json");
        var now   = DateTime.UtcNow;

        // Function lookups
        var fnPresidentOo  = functions.First(f => f.Name == "Председник ОО");
        var fnPresidentGro = functions.First(f => f.Name == "Председник ГРО");
        var fnPoverenik    = functions.First(f => f.Name == "Повереник");
        var otherFunctions = functions
            .Where(f => f.Name != "Председник ОО" && f.Name != "Председник ГРО" && f.Name != "Повереник")
            .ToList();

        var allMembers = new List<Member>();

        foreach (var unit in orgUnits)
        {
            if (unit.VoterCount == 0) continue;

            // Randomize between 0.7 and 1.3 promil
            var promil      = 0.7 + Rng.NextDouble() * 0.6;
            var memberCount = Math.Max(1, (int)Math.Round(unit.VoterCount * promil / 1000));

            var unitMembers = new List<Member>();

            for (int i = 0; i < memberCount; i++)
            {
                var isMale    = Rng.Next(2) == 0;
                var firstName = Pick(isMale ? names.FirstNamesMale : names.FirstNamesFemale);
                var lastName  = Pick(names.LastNames);
                var dob       = GenerateDob();

                var member = new Member
                {
                    FirstName         = firstName,
                    LastName          = lastName,
                    ParentName        = Rng.Next(3) == 0 ? Pick(names.ParentNames) : null,
                    DateOfBirth       = dob,
                    JMBG              = GenerateJmbg(dob, isMale),
                    Gender            = isMale ? Gender.Male : Gender.Female,
                    City              = Rng.Next(2) == 0 ? unit.Name.Replace(" ОО", "").Replace(" ГРО", "") : null,
                    Email             = Rng.Next(4) == 0 ? $"{firstName.ToLower()}.{lastName.ToLower()}@example.com" : null,
                    MaritalStatus     = (MaritalStatus)Rng.Next(4),
                    EducationLevel    = (EducationLevel)Rng.Next(6),
                    CompanyName       = Rng.Next(3) == 0 ? $"{Pick(names.CompanyPrefixes)} {Pick(names.CompanySuffixes)}" : null,
                    IsPublicCompany   = Rng.Next(2) == 0,
                    JobTitle          = Rng.Next(2) == 0 ? Pick(names.JobTitles) : null,
                    Occupation        = Rng.Next(2) == 0 ? Pick(names.Occupations) : null,
                    MembershipDate    = DateOnly.FromDateTime(now.AddDays(-Rng.Next(365, 2920))),
                    OrgUnitId         = unit.Id,
                    CreatedDate       = now,
                    LastModifiedDate  = now,
                    CreatedByUserId   = systemUserId,
                    LastModifiedByUserId = systemUserId
                };

                // 1-2 phones
                for (int p = 0; p < Rng.Next(1, 3); p++)
                {
                    member.Phones.Add(new Phone
                    {
                        Number               = GeneratePhone(),
                        Type                 = (PhoneType)Rng.Next(3),
                        CreatedDate          = now,
                        LastModifiedDate     = now,
                        CreatedByUserId      = systemUserId,
                        LastModifiedByUserId = systemUserId
                    });
                }

                // 0-2 random extra functions (not president/trustee — assigned separately)
                int fnCount = Rng.Next(3);
                var assigned = new HashSet<int>();
                for (int f = 0; f < fnCount && assigned.Count < otherFunctions.Count; f++)
                {
                    int fid;
                    do { fid = otherFunctions[Rng.Next(otherFunctions.Count)].Id; }
                    while (!assigned.Add(fid));

                    member.MemberFunctions.Add(new MemberFunction
                    {
                        FunctionId           = fid,
                        AssignedDate         = member.MembershipDate,
                        CreatedDate          = now,
                        LastModifiedDate     = now,
                        CreatedByUserId      = systemUserId,
                        LastModifiedByUserId = systemUserId
                    });
                }

                unitMembers.Add(member);
                allMembers.Add(member);
            }

            // Save batch so we get IDs for trustee assignment
            context.Members.AddRange(unitMembers);
            await context.SaveChangesAsync();

            // Assign president function and wire trustee
            var president = unitMembers[0];
            var presidentFn = unit.Type == OrgUnitType.City ? fnPresidentGro : fnPresidentOo;

            president.MemberFunctions.Add(new MemberFunction
            {
                FunctionId           = presidentFn.Id,
                AssignedDate         = president.MembershipDate,
                CreatedDate          = now,
                LastModifiedDate     = now,
                CreatedByUserId      = systemUserId,
                LastModifiedByUserId = systemUserId
            });

            unit.TrusteeId = president.Id;

            // Determine promil achieved and set trustfulness
            double actualPromil = (double)unitMembers.Count / unit.VoterCount * 1000;
            unit.IsTrustful = actualPromil >= 1.0;

            // If not trustful, assign Повереник to the president instead
            if (!unit.IsTrustful)
            {
                president.MemberFunctions.Add(new MemberFunction
                {
                    FunctionId           = fnPoverenik.Id,
                    AssignedDate         = president.MembershipDate,
                    CreatedDate          = now,
                    LastModifiedDate     = now,
                    CreatedByUserId      = systemUserId,
                    LastModifiedByUserId = systemUserId
                });
            }

            await context.SaveChangesAsync();
        }
    }

    private static string Pick(string[] arr) => arr[Rng.Next(arr.Length)];

    private static DateOnly GenerateDob()
    {
        var min = DateTime.UtcNow.AddYears(-75);
        var range = (DateTime.UtcNow.AddYears(-18) - min).Days;
        return DateOnly.FromDateTime(min.AddDays(Rng.Next(range)));
    }

    private static string GenerateJmbg(DateOnly dob, bool isMale)
    {
        var raw =
            dob.Day.ToString("D2") +
            dob.Month.ToString("D2") +
            (dob.Year % 100).ToString("D2") +
            Rng.Next(70, 799).ToString("D3") +
            Rng.Next(0, 100).ToString("D2") +
            (isMale ? Rng.Next(0, 500) : Rng.Next(500, 1000)).ToString("D3").Substring(0, 1) +
            Rng.Next(0, 10).ToString();
        return raw[..13];
    }

    private static string GeneratePhone() =>
        $"+381{Rng.Next(60, 70)}{Rng.Next(100, 999)}{Rng.Next(1000, 9999)}";
}
