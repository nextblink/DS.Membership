using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
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
}
