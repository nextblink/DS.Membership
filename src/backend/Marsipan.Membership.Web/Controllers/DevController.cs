using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Web.Controllers;

/// <summary>
/// Development-only endpoints used by the Playwright e2e test harness.
/// Every action no-ops with 404 outside the Development environment.
/// </summary>
[ApiController]
[Route("api/dev")]
[AllowAnonymous]
public class DevController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ApplicationContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private static readonly int[] SeedFunctionIds = [1, 2, 3, 4, 5, 6];
    private static readonly int[] SeedOrgUnitIds = [1, 2, 3];
    private const string DevSuperAdminEmail = "admin@local.com";
    private const string TestPassword = "Test123!";

    public DevController(
        IWebHostEnvironment env,
        ApplicationContext db,
        UserManager<ApplicationUser> userManager)
    {
        _env = env;
        _db = db;
        _userManager = userManager;
    }

    /// <summary>
    /// Wipe transactional data (Forms, FormImages on-disk + rows, Members,
    /// Phones, MemberFunctions). Functions/OrgUnits are reduced to their
    /// seeded rows. ApplicationUsers other than the dev SuperAdmin are
    /// hard-deleted. Dev-only.
    /// </summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset()
    {
        if (!_env.IsDevelopment()) return NotFound();

        // FormImages -> Forms (children first to satisfy FKs)
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM [FormImages]");
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM [Forms]");

        // Member-side children -> Members
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM [MemberFunctions]");
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM [Phones]");
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM [Members]");

        // Non-seed Functions
        await _db.Database.ExecuteSqlRawAsync(
            "DELETE FROM [Functions] WHERE [Id] NOT IN (1,2,3,4,5,6)");
        // Reset seed Functions to clean audit state
        await _db.Database.ExecuteSqlRawAsync(
            "UPDATE [Functions] SET [IsDeleted] = 0, [LastModifiedDate] = NULL, [LastModifiedByUserId] = NULL WHERE [Id] IN (1,2,3,4,5,6)");

        // Non-seed OrgUnits (avoid breaking parent-child FK by deleting non-seed children first;
        // since seed includes 1,2,3 and any non-seed are leaves added by tests, a single delete is safe)
        await _db.Database.ExecuteSqlRawAsync(
            "DELETE FROM [OrgUnits] WHERE [Id] NOT IN (1,2,3)");
        await _db.Database.ExecuteSqlRawAsync(
            "UPDATE [OrgUnits] SET [IsDeleted] = 0, [LastModifiedDate] = NULL, [LastModifiedByUserId] = NULL WHERE [Id] IN (1,2,3)");

        // Wipe non-seed users (everything except dev SuperAdmin) — hard delete via Identity
        var users = await _userManager.Users.ToListAsync();
        foreach (var user in users)
        {
            if (string.Equals(user.Email, DevSuperAdminEmail, StringComparison.OrdinalIgnoreCase))
                continue;
            await _userManager.DeleteAsync(user);
        }

        // Wipe on-disk uploads/forms/* contents
        var uploadsRoot = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "forms");
        if (Directory.Exists(uploadsRoot))
        {
            foreach (var dir in Directory.EnumerateDirectories(uploadsRoot))
            {
                try { Directory.Delete(dir, recursive: true); } catch { /* ignore */ }
            }
            foreach (var file in Directory.EnumerateFiles(uploadsRoot))
            {
                // Preserve .gitkeep / dotfiles so the directory survives a wipe in
                // version control (.gitkeep is the only sentinel we expect here).
                var name = Path.GetFileName(file);
                if (string.IsNullOrEmpty(name) || name.StartsWith('.')) continue;
                try { System.IO.File.Delete(file); } catch { /* ignore */ }
            }
        }

        return Ok(new { reset = true });
    }

    /// <summary>
    /// Idempotently create a fixed set of test users covering the full role
    /// matrix. Returns which users were freshly created vs. already present.
    /// Dev-only.
    /// </summary>
    [HttpPost("seed-test-users")]
    public async Task<IActionResult> SeedTestUsers()
    {
        if (!_env.IsDevelopment()) return NotFound();

        var spec = new (string Email, string Role, int? OrgUnitId)[]
        {
            ("admin@test.local", "Admin", null),
            ("localadmin1@test.local", "LocalAdmin", 1),
            ("localadmin2@test.local", "LocalAdmin", 3),
            ("operator1@test.local", "Operator", 1),
            ("operator2@test.local", "Operator", 1),
            ("viewer1@test.local", "Viewer", 1),
        };

        var created = new List<string>();
        var existed = new List<string>();

        foreach (var (email, role, orgUnitId) in spec)
        {
            var existing = await _userManager.FindByEmailAsync(email);
            if (existing is not null)
            {
                existed.Add(email);
                continue;
            }

            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                OrgUnitId = orgUnitId,
            };

            var createResult = await _userManager.CreateAsync(user, TestPassword);
            if (!createResult.Succeeded)
            {
                return Problem(
                    title: $"Failed to create {email}",
                    detail: string.Join("; ", createResult.Errors.Select(e => e.Description)));
            }

            var roleResult = await _userManager.AddToRoleAsync(user, role);
            if (!roleResult.Succeeded)
            {
                return Problem(
                    title: $"Failed to assign role {role} to {email}",
                    detail: string.Join("; ", roleResult.Errors.Select(e => e.Description)));
            }

            created.Add(email);
        }

        return Ok(new { created, existed });
    }

    /// <summary>
    /// Seed realistic Serbian demo members, phones, member-functions, and forms.
    /// Idempotent — skips members whose JMBG already exists. Dev-only.
    /// </summary>
    [HttpPost("seed-demo-data")]
    public async Task<IActionResult> SeedDemoData()
    {
        if (!_env.IsDevelopment()) return NotFound();

        var adminUser = await _userManager.FindByEmailAsync(DevSuperAdminEmail);
        if (adminUser is null) return Problem("Dev SuperAdmin not found.");

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        var members = new[]
        {
            new { FirstName = "Милан",     LastName = "Петровић",   Parent = "Јован",   Dob = new DateOnly(1985, 3, 14), JMBG = "1403985710123", Gender = Gender.Male,   City = "Београд",   Postal = "11000", Email = "milan.petrovic@gmail.com",   Marital = MaritalStatus.Married,  Edu = EducationLevel.University, Job = "Инжењер", Company = "Телеком Србија", CompanyCity = "Београд", IsPublic = true,  Occupation = "Инжењерство", OrgUnit = 2, Phone = "0641234567", PhoneType = PhoneType.Mobile, FuncId = 2, MemberDate = new DateOnly(2019, 6, 1) },
            new { FirstName = "Јелена",    LastName = "Николић",    Parent = "Петар",   Dob = new DateOnly(1990, 7, 22), JMBG = "2207990715234", Gender = Gender.Female, City = "Нови Сад",  Postal = "21000", Email = "jelena.nikolic@yahoo.com",    Marital = MaritalStatus.Single,   Edu = EducationLevel.Masters,    Job = "Правник", Company = "ПКБ Корпорација", CompanyCity = "Нови Сад", IsPublic = false, Occupation = "Право",        OrgUnit = 3, Phone = "0652345678", PhoneType = PhoneType.Mobile, FuncId = 4, MemberDate = new DateOnly(2020, 2, 15) },
            new { FirstName = "Драган",    LastName = "Јовановић",  Parent = "Миломир", Dob = new DateOnly(1978, 11, 5), JMBG = "0511978710345", Gender = Gender.Male,   City = "Лазаревац", Postal = "11550", Email = (string?)null,                  Marital = MaritalStatus.Married,  Edu = EducationLevel.Secondary,  Job = "Возач",   Company = "ЈКП Паркинг сервис", CompanyCity = "Лазаревац", IsPublic = true, Occupation = "Саобраћај",   OrgUnit = 2, Phone = "0113456789", PhoneType = PhoneType.Landline, FuncId = 1, MemberDate = new DateOnly(2018, 9, 10) },
            new { FirstName = "Снежана",   LastName = "Марковић",   Parent = "Радован", Dob = new DateOnly(1993, 4, 18), JMBG = "1804993714456", Gender = Gender.Female, City = "Београд",   Postal = "11070", Email = "snezana.markovic@hotmail.com", Marital = MaritalStatus.Divorced, Edu = EducationLevel.University, Job = "Економиста", Company = "НИС", CompanyCity = "Нови Сад", IsPublic = true, Occupation = "Финансије",    OrgUnit = 3, Phone = "0664567890", PhoneType = PhoneType.Mobile, FuncId = 5, MemberDate = new DateOnly(2021, 1, 20) },
            new { FirstName = "Немања",    LastName = "Стојановић", Parent = "Слободан",Dob = new DateOnly(1982, 8, 30), JMBG = "3008982710567", Gender = Gender.Male,   City = "Земун",     Postal = "11080", Email = "nemanja.stojanovic@gmail.com", Marital = MaritalStatus.Married,  Edu = EducationLevel.Higher,     Job = "Техничар", Company = "Застава аутомобили", CompanyCity = "Крагујевац", IsPublic = false, Occupation = "Техника",    OrgUnit = 2, Phone = "0675678901", PhoneType = PhoneType.Mobile, FuncId = 3, MemberDate = new DateOnly(2017, 5, 5) },
            new { FirstName = "Тамара",    LastName = "Лазић",      Parent = "Зоран",   Dob = new DateOnly(1988, 1, 12), JMBG = "1201988715678", Gender = Gender.Female, City = "Нови Сад",  Postal = "21000", Email = "tamara.lazic@outlook.com",    Marital = MaritalStatus.Single,   Edu = EducationLevel.University, Job = "Архитекта", Company = "Урбанизам Нови Сад", CompanyCity = "Нови Сад", IsPublic = true, Occupation = "Архитектура", OrgUnit = 3, Phone = "0686789012", PhoneType = PhoneType.Mobile, FuncId = 1, MemberDate = new DateOnly(2022, 3, 8) },
            new { FirstName = "Александар",LastName = "Ђорђевић",   Parent = "Бранко",  Dob = new DateOnly(1975, 5, 25), JMBG = "2505975710789", Gender = Gender.Male,   City = "Панчево",   Postal = "26000", Email = (string?)null,                  Marital = MaritalStatus.Married,  Edu = EducationLevel.Doctorate,  Job = "Професор", Company = "Универзитет у Београду", CompanyCity = "Београд", IsPublic = true, Occupation = "Образовање",OrgUnit = 2, Phone = "0697890123", PhoneType = PhoneType.Mobile, FuncId = 2, MemberDate = new DateOnly(2016, 11, 30) },
            new { FirstName = "Ивана",     LastName = "Поповић",    Parent = "Миодраг", Dob = new DateOnly(1995, 9, 8),  JMBG = "0809995714890", Gender = Gender.Female, City = "Суботица",  Postal = "24000", Email = "ivana.popovic@gmail.com",     Marital = MaritalStatus.Single,   Edu = EducationLevel.University, Job = "Маркетинг менаџер", Company = "Делта холдинг", CompanyCity = "Београд", IsPublic = false, Occupation = "Маркетинг",  OrgUnit = 3, Phone = "0608901234", PhoneType = PhoneType.Mobile, FuncId = 4, MemberDate = new DateOnly(2023, 7, 14) },
            new { FirstName = "Бојан",     LastName = "Вуковић",    Parent = "Горан",   Dob = new DateOnly(1980, 12, 3), JMBG = "0312980710901", Gender = Gender.Male,   City = "Крагујевац",Postal = "34000", Email = "bojan.vukovic@gmail.com",     Marital = MaritalStatus.Married,  Edu = EducationLevel.Secondary,  Job = "Монтер",  Company = "ЕПС",              CompanyCity = "Крагујевац", IsPublic = true, Occupation = "Електроника", OrgUnit = 2, Phone = "0619012345", PhoneType = PhoneType.Landline, FuncId = 1, MemberDate = new DateOnly(2015, 4, 22) },
            new { FirstName = "Милица",    LastName = "Станојевић", Parent = "Драгиша", Dob = new DateOnly(1997, 6, 17), JMBG = "1706997715012", Gender = Gender.Female, City = "Ниш",       Postal = "18000", Email = "milica.stanojevic@yahoo.com", Marital = MaritalStatus.Single,   Edu = EducationLevel.Masters,    Job = "Лекар",   Company = "КБЦ Звездара",     CompanyCity = "Београд", IsPublic = true, Occupation = "Медицина",    OrgUnit = 3, Phone = "0620123456", PhoneType = PhoneType.Mobile, FuncId = 5, MemberDate = new DateOnly(2024, 1, 3) },
        };

        var seeded = 0;
        foreach (var m in members)
        {
            if (await _db.Members.IgnoreQueryFilters().AnyAsync(x => x.JMBG == m.JMBG))
                continue;

            var member = new Member
            {
                FirstName = m.FirstName, LastName = m.LastName, ParentName = m.Parent,
                DateOfBirth = m.Dob, JMBG = m.JMBG, Gender = m.Gender,
                City = m.City, PostalCode = m.Postal, Email = m.Email,
                MaritalStatus = m.Marital, EducationLevel = m.Edu,
                JobTitle = m.Job, CompanyName = m.Company, CompanyCity = m.CompanyCity,
                IsPublicCompany = m.IsPublic, Occupation = m.Occupation,
                MembershipDate = m.MemberDate, OrgUnitId = m.OrgUnit,
                CreatedDate = now, CreatedByUserId = adminUser.Id,
            };
            _db.Members.Add(member);
            await _db.SaveChangesAsync();

            _db.Add(new Phone { Number = m.Phone, Type = m.PhoneType, MemberId = member.Id, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = adminUser.Id, LastModifiedByUserId = adminUser.Id });
            _db.Add(new MemberFunction { MemberId = member.Id, FunctionId = m.FuncId, AssignedDate = m.MemberDate, CreatedDate = now, LastModifiedDate = now, CreatedByUserId = adminUser.Id, LastModifiedByUserId = adminUser.Id });

            var form = new Form
            {
                FormNumber = $"OB-{2024}-{member.Id:D4}",
                FormDate = m.MemberDate,
                MunicipalBoard = m.City,
                MemberId = member.Id,
                Status = seeded % 3 == 0 ? FormStatus.Verified : seeded % 3 == 1 ? FormStatus.Pending : FormStatus.Rejected,
                CreatedByUserId = adminUser.Id,
                LastModifiedByUserId = adminUser.Id,
                CreatedDate = now,
                LastModifiedDate = now,
            };
            _db.Add(form);
            await _db.SaveChangesAsync();

            seeded++;
        }

        return Ok(new { seeded });
    }
}
