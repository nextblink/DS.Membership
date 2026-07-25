using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// One operator's own calling figures, returned by
/// <c>GET /api/call-center/my-stats</c>. Always about the calling user —
/// there is no operator-id parameter anywhere in this flow.
/// </summary>
public class OperatorStatsDto
{
    public int CallsToday { get; set; }
    public int CallsLast7Days { get; set; }
    public int CallsTotal { get; set; }

    public List<OutcomeCountDto> OutcomeBreakdown { get; set; } = new();

    /// <summary>Contacts in the pools this operator is assigned to.</summary>
    public int QueueTotal { get; set; }

    /// <summary>Of <see cref="QueueTotal"/>, those with a final status set.</summary>
    public int QueueResolved { get; set; }

    public List<RecentCallDto> RecentCalls { get; set; } = new();
}

public class OutcomeCountDto
{
    public CallOutcome Outcome { get; set; }
    public int Count { get; set; }
}

public class RecentCallDto
{
    public int CallContactId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public DateTime CalledAt { get; set; }
    public CallOutcome Outcome { get; set; }
}
