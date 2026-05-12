using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Business operations for the Members aggregate (members + nested phones + functions).
/// All queries are scoped via <c>ApplyMemberScope</c>.
/// </summary>
public interface IMembersService
{
    Task<PagedResultDto<MemberListItemDto>> SearchAsync(MemberQuery q, CancellationToken ct = default);

    Task<MemberDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default);

    /// <exception cref="ConflictException">JMBG already exists.</exception>
    Task<MemberDetailsDto> CreateAsync(CreateMemberDto dto, CancellationToken ct = default);

    /// <returns>False when the member does not exist or is outside the caller's scope.</returns>
    /// <exception cref="ConflictException">JMBG already exists on a different member.</exception>
    Task<bool> UpdateAsync(int id, UpdateMemberDto dto, CancellationToken ct = default);

    Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default);

    Task<PhoneDto?> AddPhoneAsync(int memberId, AddPhoneDto dto, CancellationToken ct = default);
    Task<bool> RemovePhoneAsync(int memberId, int phoneId, CancellationToken ct = default);

    Task<List<MemberFunctionDto>?> ListFunctionsAsync(int memberId, CancellationToken ct = default);
    Task<MemberFunctionDto?> AddFunctionAsync(int memberId, AddMemberFunctionDto dto, CancellationToken ct = default);
    Task<bool> RemoveFunctionAsync(int memberId, int mfId, CancellationToken ct = default);
}
