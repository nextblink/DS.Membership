using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Telegram.API.Controllers;

[ApiController]
[Route("api/telegram/auth")]
public class TelegramAuthController : ControllerBase
{
    private readonly ITelegramAuthService _auth;
    private readonly ApplicationContext _db;
    public TelegramAuthController(ITelegramAuthService auth, ApplicationContext db)
    {
        _auth = auth;
        _db = db;
    }

    public record TelegramAuthRequest(string InitData, string? Phone = null);

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Auth([FromBody] TelegramAuthRequest request, CancellationToken ct)
    {
        var payload = _auth.ValidateInitData(request.InitData);
        if (payload is null) return Unauthorized(new { reason = "invalid_init_data" });

        var result = await _auth.AuthenticateAsync(request.InitData, request.Phone, ct);
        if (result is null) return Unauthorized(new { reason = "member_not_found", telegramUserId = payload.TelegramUserId });
        return Ok(result);
    }

    public record DebugPhoneResult(bool found, string normalisedWith, string normalisedWithout, string? dbNumber, int? memberId, bool memberDeleted);

    [HttpGet("debug-phone")]
    [AllowAnonymous]
    public async Task<IActionResult> DebugPhone([FromQuery] string phone, CancellationToken ct)
    {
        var normalised = phone.Replace(" ", "").Replace("-", "").TrimStart('+');
        var withPlus = "+" + normalised;
        var dbPhone = await _db.Phones
            .Include(p => p.Member)
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Number == normalised || p.Number == withPlus, ct);
        return Ok(new DebugPhoneResult(
            dbPhone != null,
            withPlus,
            normalised,
            dbPhone?.Number,
            dbPhone?.MemberId,
            dbPhone?.Member?.IsDeleted ?? false));
    }

    public record LinkRequest(long TelegramUserId, int MemberId, string? TelegramUsername);

    /// <summary>Dev/admin endpoint — manually link a Telegram user to a member.</summary>
    [HttpPost("link")]
    [AllowAnonymous]
    public async Task<IActionResult> Link([FromBody] LinkRequest request, CancellationToken ct)
    {
        var member = await _db.Members.FindAsync([request.MemberId], ct);
        if (member is null) return NotFound("Member not found.");

        var existing = await _db.TelegramLinks
            .FirstOrDefaultAsync(t => t.TelegramUserId == request.TelegramUserId, ct);

        if (existing is null)
        {
            _db.TelegramLinks.Add(new TelegramLink
            {
                MemberId = request.MemberId,
                TelegramUserId = request.TelegramUserId,
                TelegramUsername = request.TelegramUsername,
                LinkedAt = DateTime.UtcNow,
                CreatedDate = DateTime.UtcNow,
                LastModifiedDate = DateTime.UtcNow,
                CreatedByUserId = request.MemberId.ToString(),
                LastModifiedByUserId = request.MemberId.ToString()
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok(new { linked = true, memberId = request.MemberId, telegramUserId = request.TelegramUserId });
    }
}
