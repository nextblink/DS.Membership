namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Standard paged-list response envelope used by every list endpoint.
/// Created locally for the issue/12 worktree to compile in isolation; if
/// issue #11 introduces the same type, the duplicate will be resolved at
/// merge time.
/// </summary>
public class PagedResultDto<T>
{
    public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
