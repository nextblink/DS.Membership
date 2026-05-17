using Marcipano.Application.Interfaces;
using Marcipano.Domain.Entities;
using Marcipano.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marcipano.Infrastructure.Repositories;

public class FcmSubscriptionRepository : IFcmSubscriptionRepository
{
    private readonly AppDbContext _db;

    public FcmSubscriptionRepository(AppDbContext db) => _db = db;

    public async Task UpsertAsync(string memberId, string fcmToken, CancellationToken ct = default)
    {
        var existing = await _db.FcmSubscriptions
            .FirstOrDefaultAsync(s => s.MemberId == memberId && s.FcmToken == fcmToken, ct);

        if (existing is null)
        {
            _db.FcmSubscriptions.Add(new FcmSubscription
            {
                MemberId = memberId,
                FcmToken = fcmToken,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(string memberId, string fcmToken, CancellationToken ct = default)
    {
        var sub = await _db.FcmSubscriptions
            .FirstOrDefaultAsync(s => s.MemberId == memberId && s.FcmToken == fcmToken, ct);

        if (sub is not null)
        {
            _db.FcmSubscriptions.Remove(sub);
            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<IReadOnlyList<string>> GetTokensForTargetAsync(
        string? targetLevel, string? targetRole, string? targetTerritoryId,
        CancellationToken ct = default)
    {
        var query = _db.FcmSubscriptions
            .Include(s => s.Member)
            .AsQueryable();

        if (targetLevel is not null)
            query = query.Where(s => s.Member.Level.ToString().ToLower() == targetLevel.ToLower());

        if (targetRole is not null)
            query = query.Where(s => s.Member.Role == targetRole);

        if (targetTerritoryId is not null)
            query = query.Where(s => s.Member.TerritoryUnitId == targetTerritoryId);

        return await query.Select(s => s.FcmToken).Distinct().ToListAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetTokensForMemberAsync(
        string memberId, CancellationToken ct = default)
    {
        return await _db.FcmSubscriptions
            .Where(s => s.MemberId == memberId)
            .Select(s => s.FcmToken)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<(string MemberId, string Token, string TaskTitle, DateTime DueDate)>>
        GetTokensForTasksDueTomorrowAsync(CancellationToken ct = default)
    {
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var dayAfter  = tomorrow.AddDays(1);

        // Find tasks due tomorrow that haven't been completed by the assigned members
        var results = await (
            from task in _db.Tasks
            where task.DueDate >= tomorrow && task.DueDate < dayAfter
            join member in _db.Members on 1 equals 1 // cross-join, filter below
            where
                (task.TargetLevel == null       || member.Level.ToString().ToLower() == task.TargetLevel.ToLower()) &&
                (task.TargetRole == null         || member.Role == task.TargetRole) &&
                (task.TargetTerritoryId == null  || member.TerritoryUnitId == task.TargetTerritoryId)
            // Exclude members who already completed the task
            where !_db.TaskCompletions.Any(tc => tc.TaskId == task.Id && tc.MemberId == member.Id)
            join sub in _db.FcmSubscriptions on member.Id equals sub.MemberId
            select new
            {
                member.Id,
                sub.FcmToken,
                task.Title,
                task.DueDate,
            }
        ).ToListAsync(ct);

        return results
            .Select(r => (r.Id, r.FcmToken, r.Title, r.DueDate))
            .ToList();
    }
}
