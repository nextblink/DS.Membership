using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallContactService
{
    Task<PagedResultDto<CallContactListItemDto>> SearchAsync(CallContactQuery query, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default);
    Task SaveOutcomeAsync(int id, SaveCallOutcomeRequest request, CancellationToken ct = default);
    Task ReleaseClaimAsync(int id, CancellationToken ct = default);
    Task<List<MemberMatchDto>> SuggestMemberMatchesAsync(int id, CancellationToken ct = default);
    Task LinkToMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task UnlinkAsync(int id, CancellationToken ct = default);
    Task<EnrollmentPrefillDto?> GetEnrollmentPrefillAsync(int id, CancellationToken ct = default);
    Task SetConvertedMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default);
}
