using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// CRUD operations for the <c>Function</c> lookup aggregate.
/// </summary>
public interface IFunctionsService
{
    Task<List<FunctionDto>> ListAsync(CancellationToken ct = default);

    Task<FunctionDto?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<FunctionDto> CreateAsync(CreateFunctionDto dto, CancellationToken ct = default);

    Task<bool> UpdateAsync(int id, UpdateFunctionDto dto, CancellationToken ct = default);

    /// <summary>
    /// Soft-deletes the function. Returns <c>false</c> if the function does not
    /// exist OR if any <c>MemberFunction</c> still references it (controller maps
    /// the in-use case to 409 Conflict).
    /// </summary>
    Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default);
}
