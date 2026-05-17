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

        var orgUnits  = await context.Committees.Include(o => o.Parent).ToListAsync();
        var functions = await context.Functions.ToListAsync();
        if (!orgUnits.Any() || !functions.Any()) return;

        var names = SeedDataLoader.Load<NamesData>("member-names.json");
        var now   = DateTime.UtcNow;

        // Function lookups by name
        Function Fn(string name) => functions.First(f => f.Name == name);
        var fnMemberOo     = Fn("Члан ОО");
        var fnMemberGro    = Fn("Члан ГРО");
        var fnPresidentOo  = Fn("Председник ОО");
        var fnPresidentGro = Fn("Председник ГРО");
        var fnPoverenik    = Fn("Повереник");
        var fnMemberGo     = Fn("Члан ГО");
        var fnMemberIo     = Fn("Члан ИО");
        var fnMemberPres   = Fn("Члан председништва");

        // Other optional functions (not leadership, not membership)
        var optionalFunctions = functions
            .Where(f => f.Name is not (
                "Члан ОО" or "Члан ГРО" or "Члан ГО" or "Члан ИО" or "Члан председништва" or
                "Председник ОО" or "Председник ГРО" or "Председник ГО" or "Председник ИО" or
                "Председник партије" or "Потпредседник партије" or "Повереник"))
            .ToList();

        // Local OO/GRO units only (skip national bodies for member seeding pass 1)
        var localUnits = orgUnits
            .Where(u => u.Type == CommitteeType.City || u.Type == CommitteeType.Municipal)
            .ToList();

        var allSeededMembers = new List<Member>();

        // ─── Pass 1: seed members for each local unit ────────────────────────────
        foreach (var unit in localUnits)
        {
            if (unit.VoterCount == 0) continue;

            var promil      = 0.7 + Rng.NextDouble() * 0.6;
            var memberCount = Math.Max(1, (int)Math.Round(unit.VoterCount * promil / 1000));
            var memberFn    = unit.Type == CommitteeType.City ? fnMemberGro : fnMemberOo;
            var presidentFn = unit.Type == CommitteeType.City ? fnPresidentGro : fnPresidentOo;

            var unitMembers = new List<Member>();
            for (int i = 0; i < memberCount; i++)
            {
                var isMale    = Rng.NextDouble() >= 1.0 / 3.0;
                var firstName = Pick(isMale ? names.FirstNamesMale : names.FirstNamesFemale);
                var lastName  = Pick(names.LastNames);
                var dob       = GenerateDob();
                var unitName  = unit.Name.Replace(" ОО", "").Replace(" ГРО", "");

                var member = new Member
                {
                    FirstName            = firstName,
                    LastName             = lastName,
                    ParentName           = Rng.Next(3) == 0 ? Pick(names.ParentNames) : null,
                    DateOfBirth          = dob,
                    JMBG                 = GenerateJmbg(dob, isMale),
                    Gender               = isMale ? Gender.Male : Gender.Female,
                    City                 = Rng.Next(2) == 0 ? unitName : null,
                    Email                = Rng.Next(4) == 0 ? $"{firstName.ToLower()}.{lastName.ToLower()}@example.com" : null,
                    MaritalStatus        = (MaritalStatus)Rng.Next(4),
                    EducationLevel       = (EducationLevel)Rng.Next(6),
                    CompanyName          = Rng.Next(3) == 0 ? $"{Pick(names.CompanyPrefixes)} {Pick(names.CompanySuffixes)}" : null,
                    IsPublicCompany      = Rng.Next(2) == 0,
                    JobTitle             = Rng.Next(2) == 0 ? Pick(names.JobTitles) : null,
                    Occupation           = Rng.Next(2) == 0 ? Pick(names.Occupations) : null,
                    MembershipDate       = DateOnly.FromDateTime(now.AddDays(-Rng.Next(365, 2920))),
                    CommitteeId            = unit.Id,
                    CreatedDate          = now,
                    LastModifiedDate     = now,
                    CreatedByUserId      = systemUserId,
                    LastModifiedByUserId = systemUserId
                };

                // Phones
                for (int p = 0; p < Rng.Next(1, 3); p++)
                {
                    member.Phones.Add(new Phone
                    {
                        Number = GeneratePhone(), Type = (PhoneType)Rng.Next(3),
                        CreatedDate = now, LastModifiedDate = now,
                        CreatedByUserId = systemUserId, LastModifiedByUserId = systemUserId
                    });
                }

                // Explicit primary membership function
                member.MemberFunctions.Add(MF(memberFn.Id, null, member.MembershipDate, systemUserId, now));

                // Optional secondary functions
                int fnCount = Rng.Next(3);
                var assigned = new HashSet<int> { memberFn.Id };
                for (int f = 0; f < fnCount && assigned.Count <= optionalFunctions.Count; f++)
                {
                    int fid;
                    do { fid = optionalFunctions[Rng.Next(optionalFunctions.Count)].Id; }
                    while (!assigned.Add(fid));
                    member.MemberFunctions.Add(MF(fid, null, member.MembershipDate, systemUserId, now));
                }

                unitMembers.Add(member);
                allSeededMembers.Add(member);
            }

            context.Members.AddRange(unitMembers);
            await context.SaveChangesAsync();

            // Assign president — first member of the unit
            var president = unitMembers[0];
            president.MemberFunctions.Add(MF(presidentFn.Id, null, president.MembershipDate, systemUserId, now));
            unit.TrusteeId = president.Id;

            // Promil check → set trustfulness
            double actualPromil = (double)unitMembers.Count / unit.VoterCount * 1000;
            unit.IsTrustful = actualPromil >= 1.0;
            if (!unit.IsTrustful)
                president.MemberFunctions.Add(MF(fnPoverenik.Id, null, president.MembershipDate, systemUserId, now));

            await context.SaveChangesAsync();
        }

        // ─── Pass 2: city GRO dual membership (~20% of OO members under a GRO) ──
        var groByMunicipalityId = localUnits
            .Where(u => u.Type == CommitteeType.City)
            .ToDictionary(u => u.MunicipalityId!.Value);

        var ooUnitsWithParentGro = localUnits
            .Where(u => u.Type == CommitteeType.Municipal && u.ParentId.HasValue)
            .ToList();

        foreach (var oo in ooUnitsWithParentGro)
        {
            // Find the parent GRO through the Committee parent chain
            var parentGro = orgUnits.FirstOrDefault(u => u.Id == oo.ParentId && u.Type == CommitteeType.City);
            if (parentGro == null) continue;

            var ooMembers = allSeededMembers.Where(m => m.CommitteeId == oo.Id).ToList();
            var delegates = ooMembers.OrderBy(_ => Rng.Next()).Take((int)Math.Ceiling(ooMembers.Count * 0.2));

            foreach (var m in delegates)
                m.MemberFunctions.Add(MF(fnMemberGro.Id, parentGro.Id, m.MembershipDate, systemUserId, now));
        }
        await context.SaveChangesAsync();

        // ─── Pass 3: national body memberships ───────────────────────────────────
        var mainCommittee = orgUnits.First(u => u.Type == CommitteeType.MainCommittee);
        var execCommittee = orgUnits.First(u => u.Type == CommitteeType.ExecutiveCommittee);
        var presidency    = orgUnits.First(u => u.Type == CommitteeType.Presidency);

        var shuffled = allSeededMembers.OrderBy(_ => Rng.Next()).ToList();

        var goMembers = shuffled.Take(150).ToList();
        foreach (var m in goMembers)
            m.MemberFunctions.Add(MF(fnMemberGo.Id, mainCommittee.Id, m.MembershipDate, systemUserId, now));

        var ioMembers = goMembers.Take(10).ToList();
        foreach (var m in ioMembers)
            m.MemberFunctions.Add(MF(fnMemberIo.Id, execCommittee.Id, m.MembershipDate, systemUserId, now));

        var predsMembers = shuffled.Skip(150).Take(10).ToList();
        foreach (var m in predsMembers)
            m.MemberFunctions.Add(MF(fnMemberPres.Id, presidency.Id, m.MembershipDate, systemUserId, now));

        await context.SaveChangesAsync();
    }

    private static MemberFunction MF(int fnId, int? orgUnitId, DateOnly date, string userId, DateTime now) =>
        new()
        {
            FunctionId           = fnId,
            CommitteeId            = orgUnitId,
            AssignedDate         = date,
            CreatedDate          = now,
            LastModifiedDate     = now,
            CreatedByUserId      = userId,
            LastModifiedByUserId = userId
        };

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
            (isMale ? Rng.Next(0, 500) : Rng.Next(500, 1000)).ToString("D3")[..1] +
            Rng.Next(0, 10).ToString();
        return raw[..13];
    }

    private static string GeneratePhone() =>
        $"+381{Rng.Next(60, 70)}{Rng.Next(100, 999)}{Rng.Next(1000, 9999)}";
}
