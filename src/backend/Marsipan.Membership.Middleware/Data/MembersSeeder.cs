using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

public static class MembersSeeder
{
    private static readonly Random Random = new();

    private record NamesData(
        string[] FirstNamesMale,
        string[] FirstNamesFemale,
        string[] LastNames,
        string[] ParentNames,
        string[] CompanyPrefixes,
        string[] CompanySuffixes,
        string[] JobTitles,
        string[] Occupations);

    public static async Task SeedAsync(ApplicationContext context)
    {
        if (await context.Members.AnyAsync())
            return;

        var orgUnits = await context.OrgUnits.ToListAsync();
        var functions = await context.Functions.ToListAsync();
        if (!orgUnits.Any() || !functions.Any()) return;

        var names = SeedDataLoader.Load<NamesData>("member-names.json");

        var membersToAdd = new List<Member>();

        foreach (var orgUnit in orgUnits)
        {
            var promille = Random.NextDouble() * 1.0 + 0.5;
            var count = Math.Max(1, (int)Math.Round(orgUnit.VoterCount * promille / 1000));

            for (int i = 0; i < count; i++)
            {
                var isMale = Random.Next(2) == 0;
                var firstName = Pick(isMale ? names.FirstNamesMale : names.FirstNamesFemale);
                var lastName = Pick(names.LastNames);
                var dob = GenerateDob();

                var member = new Member
                {
                    FirstName = firstName,
                    LastName = lastName,
                    ParentName = Random.Next(3) == 0 ? Pick(names.ParentNames) : null,
                    DateOfBirth = dob,
                    JMBG = GenerateJmbg(dob, isMale),
                    Gender = isMale ? Gender.Male : Gender.Female,
                    PostalCode = Random.Next(3) == 0 ? Random.Next(10000, 99999).ToString() : null,
                    IdCardNumber = Random.Next(2) == 0 ? $"{Random.Next(100000, 999999)}{(char)('A' + Random.Next(26))}" : null,
                    City = Random.Next(2) == 0 ? orgUnit.Name : null,
                    Email = Random.Next(4) == 0 ? $"{firstName.ToLower()}.{lastName.ToLower()}@example.com" : null,
                    MaritalStatus = (MaritalStatus)Random.Next(4),
                    VotingPlaceNumber = Random.Next(2) == 0 ? Random.Next(1, 5000) : null,
                    EducationLevel = (EducationLevel)Random.Next(6),
                    CompanyName = Random.Next(3) == 0 ? $"{Pick(names.CompanyPrefixes)} {Pick(names.CompanySuffixes)}" : null,
                    CompanyCity = Random.Next(3) == 0 ? orgUnit.Name : null,
                    IsPublicCompany = Random.Next(2) == 0,
                    JobTitle = Random.Next(2) == 0 ? Pick(names.JobTitles) : null,
                    Occupation = Random.Next(2) == 0 ? Pick(names.Occupations) : null,
                    MembershipDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-Random.Next(1, 730))),
                    OrgUnitId = orgUnit.Id,
                    CreatedDate = DateTime.UtcNow
                };

                var phoneCount = Random.Next(1, 4);
                for (int j = 0; j < phoneCount; j++)
                {
                    member.Phones.Add(new Phone
                    {
                        Number = $"+381{Random.Next(10, 99)}{Random.Next(100, 999)}{Random.Next(1000, 9999)}",
                        Type = (PhoneType)Random.Next(3),
                        CreatedDate = DateTime.UtcNow
                    });
                }

                var fnCount = Random.Next(3);
                var assigned = new HashSet<int>();
                for (int j = 0; j < fnCount && assigned.Count < functions.Count; j++)
                {
                    int fid;
                    do { fid = functions[Random.Next(functions.Count)].Id; } while (!assigned.Add(fid));
                    member.MemberFunctions.Add(new MemberFunction
                    {
                        FunctionId = fid,
                        AssignedDate = member.MembershipDate,
                        CreatedDate = DateTime.UtcNow
                    });
                }

                membersToAdd.Add(member);
            }
        }

        context.Members.AddRange(membersToAdd);
        await context.SaveChangesAsync();
    }

    private static string Pick(string[] arr) => arr[Random.Next(arr.Length)];

    private static DateOnly GenerateDob()
    {
        var min = DateTime.UtcNow.AddYears(-80);
        var range = (DateTime.UtcNow.AddYears(-18) - min).Days;
        return DateOnly.FromDateTime(min.AddDays(Random.Next(range)));
    }

    private static string GenerateJmbg(DateOnly dob, bool isMale)
    {
        var raw =
            dob.Day.ToString("D2") +
            dob.Month.ToString("D2") +
            (dob.Year % 100).ToString("D2") +
            Random.Next(10, 999).ToString("D3") +
            Random.Next(0, 100).ToString("D2") +
            (isMale ? Random.Next(1, 5) : Random.Next(5, 9)).ToString() +
            Random.Next(0, 10).ToString();
        return raw[..13];
    }
}
