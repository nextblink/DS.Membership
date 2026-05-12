namespace Marsipan.Membership.Middleware.DTOs;

/// <summary>
/// Standard paging envelope used by every list endpoint.
/// Contract: <c>{ items, totalCount, page, pageSize, totalPages }</c>.
/// </summary>
public class PagedResultDto<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
