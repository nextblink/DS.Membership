using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface ICallContactService
{
    Task<PagedResultDto<CallContactListItemDto>> SearchAsync(CallContactQuery query, CancellationToken ct = default);
    // Every row matching `query` (paging ignored) as a semicolon-separated, Serbian-labelled
    // CSV body — the "извоз података за даљу анализу" the spec asks for.
    Task<string> ExportCsvAsync(CallContactQuery query, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<CallContactDetailDto?> GetNextForOperatorAsync(CancellationToken ct = default);
    Task<CallContactDetailDto> ClaimAsync(int id, CancellationToken ct = default);
    Task SaveOutcomeAsync(int id, SaveCallOutcomeRequest request, CancellationToken ct = default);
    Task ReleaseClaimAsync(int id, CancellationToken ct = default);
    Task<List<MemberMatchDto>> SuggestMemberMatchesAsync(int id, CancellationToken ct = default);
    Task LinkToMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task UnlinkAsync(int id, CancellationToken ct = default);
    Task<EnrollmentPrefillDto?> GetEnrollmentPrefillAsync(int id, CancellationToken ct = default);
    Task SetConvertedMemberAsync(int id, int memberId, CancellationToken ct = default);
    Task<ImportResultDto> ImportAsync(int campaignId, Stream file, string fileName, CancellationToken ct = default);
    Task<List<PoolOptionDto>> ListMyPoolsAsync(CancellationToken ct = default);

    // One-time cleanup: within each campaign, hard-deletes contacts that share the same
    // (FirstName, LastName) plus either the same PhoneNumber or the same Address as another
    // contact still in that campaign. See method body for the exact matching/keep rules.
    Task<DedupeResultDto> RemoveDuplicatesAsync(CancellationToken ct = default);

    // Rewrites every contact's phone numbers to the "0" / "+381" house rule (PhoneNormalizer).
    // Safe to re-run — already-valid numbers are left untouched — so it can be applied after
    // each import rather than only once.
    Task<PhoneNormalizationResultDto> NormalizePhoneNumbersAsync(CancellationToken ct = default);

    // One-time reset: wipes every contact's call history/claim/script-answers/member-links back
    // to a pristine "never called" state and deletes all CallAttempt/ContactEngagementArea rows.
    Task<ResetContactsResultDto> ResetAllToNeverCalledAsync(CancellationToken ct = default);
}
