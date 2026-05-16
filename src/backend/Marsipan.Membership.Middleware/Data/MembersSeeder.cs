using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Data;

/// <summary>
/// Seed random members for each OrgUnit based on 0.5-1.5 promille of voter count.
/// Generates realistic Serbian member data including names, JMBG, and optional phone/function assignments.
/// </summary>
public static class MembersSeeder
{
    private static readonly Random Random = new();

    // Serbian first names
    private static readonly string[] FirstNamesMale =
    [
        "Marko", "Aleksandar", "Miloš", "Dragan", "Igor", "Petar", "Nikola", "Milan",
        "Vladimir", "Jovan", "Nenad", "Goran", "Branko", "Radovan", "Slobodan", "Saša",
        "Dejan", "Đorđe", "Stevan", "Vladan", "Darko", "Miroslav", "Željko", "Zoran"
    ];

    private static readonly string[] FirstNamesFemale =
    [
        "Marija", "Jasmina", "Dragana", "Milica", "Jelena", "Aleksandra", "Ivana",
        "Katarina", "Tanja", "Gordana", "Biljana", "Vesna", "Mirjana", "Zorica",
        "Mila", "Svetlana", "Nataša", "Stefanija", "Dijana", "Milena", "Slađana"
    ];

    // Serbian last names
    private static readonly string[] LastNames =
    [
        "Nikolić", "Ristić", "Marković", "Jovanović", "Milanović", "Ilić", "Petrović",
        "Kovačević", "Pavlović", "Đorđević", "Stjepanović", "Aleksić", "Bogdanović",
        "Stojanović", "Nedić", "Knežević", "Kostić", "Mandić", "Ćirković", "Tadić",
        "Stanisavljević", "Pantelić", "Šolic", "Vidaković", "Miloš", "Orlović"
    ];

    public static async Task SeedAsync(ApplicationContext context)
    {
        // Check if members already exist
        if (await context.Members.AnyAsync())
            return;

        var orgUnits = await context.OrgUnits.ToListAsync();
        var functions = await context.Functions.ToListAsync();

        if (!orgUnits.Any() || !functions.Any())
            return;

        var membersToAdd = new List<Member>();

        foreach (var orgUnit in orgUnits)
        {
            // Calculate member count: random between 0.5 and 1.5 promille of voter count
            var promille = Random.NextDouble() * 1.0 + 0.5; // 0.5-1.5
            var memberCount = Math.Max(1, (int)Math.Round(orgUnit.VoterCount * promille / 1000));

            for (int i = 0; i < memberCount; i++)
            {
                var isMale = Random.Next(2) == 0;
                var firstName = isMale ? FirstNamesMale[Random.Next(FirstNamesMale.Length)] : FirstNamesFemale[Random.Next(FirstNamesFemale.Length)];
                var lastName = LastNames[Random.Next(LastNames.Length)];
                var dateOfBirth = GenerateRandomDateOfBirth();

                var member = new Member
                {
                    FirstName = firstName,
                    LastName = lastName,
                    ParentName = Random.Next(3) == 0 ? GenerateParentName() : null,
                    DateOfBirth = dateOfBirth,
                    JMBG = GenerateJMBG(dateOfBirth, isMale),
                    Gender = isMale ? Gender.Male : Gender.Female,
                    PostalCode = Random.Next(3) == 0 ? GeneratePostalCode() : null,
                    IdCardNumber = Random.Next(2) == 0 ? GenerateIdCardNumber() : null,
                    City = Random.Next(2) == 0 ? orgUnit.Name : null,
                    Email = Random.Next(4) == 0 ? $"{firstName.ToLower()}.{lastName.ToLower()}@example.com" : null,
                    MaritalStatus = (MaritalStatus)Random.Next(4),
                    VotingPlaceNumber = Random.Next(2) == 0 ? Random.Next(1, 5000) : null,
                    EducationLevel = (EducationLevel)Random.Next(6),
                    CompanyName = Random.Next(3) == 0 ? GenerateCompanyName() : null,
                    CompanyCity = Random.Next(3) == 0 ? orgUnit.Name : null,
                    IsPublicCompany = Random.Next(2) == 0,
                    JobTitle = Random.Next(2) == 0 ? GenerateJobTitle() : null,
                    Occupation = Random.Next(2) == 0 ? GenerateOccupation() : null,
                    MembershipDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-Random.Next(1, 730))),
                    OrgUnitId = orgUnit.Id,
                    CreatedDate = DateTime.UtcNow
                };

                // Add 1-3 random phone numbers
                var phoneCount = Random.Next(1, 4);
                for (int j = 0; j < phoneCount; j++)
                {
                    member.Phones.Add(new Phone
                    {
                        Number = GeneratePhoneNumber(),
                        Type = (PhoneType)Random.Next(3),
                        CreatedDate = DateTime.UtcNow
                    });
                }

                // Add 0-2 random functions
                if (functions.Count > 0)
                {
                    var functionCount = Random.Next(3);
                    var assignedFunctionIds = new HashSet<int>();
                    for (int j = 0; j < functionCount && assignedFunctionIds.Count < functions.Count; j++)
                    {
                        int functionId;
                        do
                        {
                            functionId = functions[Random.Next(functions.Count)].Id;
                        } while (!assignedFunctionIds.Add(functionId));

                        member.MemberFunctions.Add(new MemberFunction
                        {
                            FunctionId = functionId,
                            AssignedDate = member.MembershipDate,
                            CreatedDate = DateTime.UtcNow
                        });
                    }
                }

                membersToAdd.Add(member);
            }
        }

        context.Members.AddRange(membersToAdd);
        await context.SaveChangesAsync();
    }

    private static DateOnly GenerateRandomDateOfBirth()
    {
        // Generate date between 18-80 years ago
        var today = DateTime.UtcNow;
        var minDate = today.AddYears(-80);
        var maxDate = today.AddYears(-18);
        var range = (maxDate - minDate).Days;
        var randomDate = minDate.AddDays(Random.Next(range));
        return DateOnly.FromDateTime(randomDate);
    }

    private static string GenerateJMBG(DateOnly dateOfBirth, bool isMale)
    {
        var day = dateOfBirth.Day.ToString("D2");
        var month = dateOfBirth.Month.ToString("D2");
        var year = dateOfBirth.Year % 100; // Last 2 digits
        var yearStr = year.ToString("D2");
        var region = Random.Next(10, 999).ToString("D3");
        var serial = Random.Next(0, 100).ToString("D2");
        var gender = (isMale ? Random.Next(1, 5) : Random.Next(5, 9)).ToString();
        var check = Random.Next(0, 10).ToString();

        var jmbg = day + month + yearStr + region + serial + gender + check;
        return jmbg.Substring(0, 13); // Ensure exactly 13 chars
    }

    private static string GenerateParentName()
    {
        var names = new[] { "Jovan", "Petar", "Miroslav", "Vladimir", "Marko", "Aleksandar" };
        return names[Random.Next(names.Length)];
    }

    private static string GeneratePostalCode()
    {
        return Random.Next(10000, 99999).ToString();
    }

    private static string GenerateIdCardNumber()
    {
        return $"{Random.Next(100000, 999999)}{(char)('A' + Random.Next(26))}";
    }

    private static string GenerateCompanyName()
    {
        var prefixes = new[] { "Firma", "Preduzeće", "Društvo", "Fabrika", "Radnja" };
        var suffixes = new[] { "Development", "Services", "Trade", "Production", "Consulting" };
        return $"{prefixes[Random.Next(prefixes.Length)]} {suffixes[Random.Next(suffixes.Length)]}";
    }

    private static string GenerateJobTitle()
    {
        var titles = new[] { "Direktor", "Rukovodilac", "Menadžer", "Savetnik", "Koordinator", "Asistent", "Analitičar", "Inženjer" };
        return titles[Random.Next(titles.Length)];
    }

    private static string GenerateOccupation()
    {
        var occupations = new[] { "Inženjer", "Učitelj", "Lekar", "Pravnik", "Računovođa", "Arhitekta", "Električar", "Teslar", "Pekara", "Trgovac" };
        return occupations[Random.Next(occupations.Length)];
    }

    private static string GeneratePhoneNumber()
    {
        // Serbian format: +381 XX XXX XXXX
        var areaCode = Random.Next(10, 99);
        var exchange = Random.Next(100, 999);
        var number = Random.Next(1000, 9999);
        return $"+381{areaCode}{exchange}{number}";
    }
}
