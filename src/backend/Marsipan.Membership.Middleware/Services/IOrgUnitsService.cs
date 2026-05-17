using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Application service for the Committee aggregate.
/// Provides tree retrieval plus standard CRUD with soft-delete.
/// </summary>
public interface ICommitteesService
{
    /// <summary>
    /// Load all non-deleted Committees and project to a tree.
    /// Roots are units with <c>ParentId == null</c>.
    /// </summary>
    Task<List<CommitteeTreeDto>> GetTreeAsync(CancellationToken ct = default);

    /// <summary>
    /// Load a single non-deleted Committee by id, or <c>null</c> if not found.
    /// </summary>
    Task<CommitteeDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default);

    /// <summary>
    /// Create a new Committee. Stamps audit fields from <see cref="ICurrentUserContext"/>.
    /// </summary>
    Task<CommitteeDetailsDto> CreateAsync(CreateCommitteeDto dto, CancellationToken ct = default);

    /// <summary>
    /// Update an existing Committee. Returns <c>false</c> when not found.
    /// Stamps <c>LastModified*</c> audit fields.
    /// </summary>
    Task<bool> UpdateAsync(int id, UpdateCommitteeDto dto, CancellationToken ct = default);

    /// <summary>
    /// Soft-delete a Committee by setting <c>IsDeleted = true</c>.
    /// <para>
    /// <b>Refuses to delete</b> when the unit still has any non-deleted children:
    /// returns <c>false</c> in that case rather than cascading. This is the safer
    /// choice for an aggregate that drives scope filtering and dashboard rollups —
    /// callers must explicitly reparent or delete children first.
    /// </para>
    /// <para>
    /// Returns <c>false</c> when the unit is not found.
    /// </para>
    /// </summary>
    Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default);
}
