using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <inheritdoc />
public class OperatorStatsService : IOperatorStatsService
{
    private const int RecentCallsLimit = 10;

    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;

    public OperatorStatsService(ApplicationContext db, ICurrentUserContext user)
    {
        _db = db;
        _user = user;
    }

    public async Task<OperatorStatsDto> GetMyStatsAsync(CancellationToken ct)
    {
        var userId = _user.Id;
        // Short-circuit: with no user id every query below would filter to zero
        // rows anyway, so this saves the round-trips rather than changing the
        // result. Deliberately untested — guarded and unguarded paths return
        // the same empty stats, so any behavioural test would pass with this
        // line removed.
        if (string.IsNullOrEmpty(userId))
            return new OperatorStatsDto();

        var now = DateTime.UtcNow;
        var todayCutoff = now.Date;
        var weekCutoff = now.AddDays(-7);

        // Attempts are the only per-operator record we keep; CallContact tracks
        // the claim, not who ultimately called.
        var mine = _db.CallAttempts.AsNoTracking().Where(a => a.CalledByUserId == userId);

        var callsTotal = await mine.CountAsync(ct);
        var callsToday = await mine.CountAsync(a => a.CalledAt >= todayCutoff, ct);
        var callsLast7Days = await mine.CountAsync(a => a.CalledAt >= weekCutoff, ct);

        var outcomeBreakdown = await mine
            .GroupBy(a => a.Outcome)
            .Select(g => new OutcomeCountDto { Outcome = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Reuses the existing role-aware filter: for an Operator this is exactly
        // the contacts in the pools they are assigned to.
        var scoped = _db.CallContacts.AsNoTracking().ApplyCallContactScope(_user);
        var queueTotal = await scoped.CountAsync(ct);
        var queueResolved = await scoped.CountAsync(c => c.FinalStatus != null, ct);

        var recentCalls = await mine
            .OrderByDescending(a => a.CalledAt)
            .Take(RecentCallsLimit)
            .Select(a => new RecentCallDto
            {
                CallContactId = a.CallContactId,
                ContactName = (a.CallContact.FirstName + " " + a.CallContact.LastName).Trim(),
                PhoneNumber = a.CallContact.PhoneNumber ?? string.Empty,
                CalledAt = a.CalledAt,
                Outcome = a.Outcome,
            })
            .ToListAsync(ct);

        return new OperatorStatsDto
        {
            CallsToday = callsToday,
            CallsLast7Days = callsLast7Days,
            CallsTotal = callsTotal,
            OutcomeBreakdown = outcomeBreakdown,
            QueueTotal = queueTotal,
            QueueResolved = queueResolved,
            RecentCalls = recentCalls,
        };
    }
}
