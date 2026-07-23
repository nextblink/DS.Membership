using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record CallContactQuery(
    int? CampaignId,
    int? PoolId,
    string? City,
    int? MunicipalityId,
    ContactFinalStatus? FinalStatus,
    CallOutcome? LastOutcome,
    string? Search,
    bool UnresolvedOnly = false,
    int Page = 1,
    int PageSize = 20,
    // "name" sorts by LastName/FirstName; anything else (including null/omitted) sorts by Address —
    // the queue's default, since operators work address-by-address through a neighborhood.
    string? SortBy = null,
    bool SortDesc = false);

public record CallContactListItemDto(
    int Id,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? SecondaryPhone,
    string? Address,
    string? City,
    int? MunicipalityId,
    string? MunicipalityName,
    int CampaignId,
    int? PoolId,
    string? PoolName,
    int AttemptCount,
    CallOutcome? LastOutcome,
    ContactFinalStatus? FinalStatus,
    int? MatchedMemberId,
    int? ConvertedMemberId,
    string? ImportedOutcome,
    DateOnly? MemberSince,
    string? ClaimedByUserId,
    string? ClaimedByUserName,
    DateTime? ClaimedAt);

public record CallContactDetailDto(
    int Id,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? Email,
    string? Address,
    string? City,
    int? MunicipalityId,
    string? MunicipalityName,
    int CampaignId,
    int? PoolId,
    int AttemptCount,
    CallOutcome? LastOutcome,
    PartyRelation? PartyRelation,
    ActivityLevel? ActivityLevel,
    bool? WantsToBeActive,
    string? SuggestionNote,
    bool? KnowsPotentialMembers,
    bool? WillingToEnroll,
    ContactFinalStatus? FinalStatus,
    int? MatchedMemberId,
    int? ConvertedMemberId,
    List<EngagementArea> EngagementAreas,
    string? SecondaryPhone,
    string? Jmbg,
    string? ImportedOutcome,
    string? ImportNote,
    DateOnly? MemberSince);

public record ImportResultDto(
    int Imported,
    int Skipped,
    List<string> Errors);

// Result of a one-time duplicate cleanup pass (see ICallContactService.RemoveDuplicatesAsync).
public record DedupeResultDto(int DuplicatesRemoved, int GroupsAffected);

// Result of a one-time "reset to never called" pass (see ICallContactService.ResetAllToNeverCalledAsync).
public record ResetContactsResultDto(int ContactsReset);

// Lightweight pool listing for the "which pool am I calling through" selector — Operators only
// see pools they're assigned to (CallPoolOperator), SuperAdmin/Admin see all active pools,
// mirroring ApplyCallContactScope's Operator/unrestricted split.
public record PoolOptionDto(int Id, string Name, int CampaignId);

// Full call-script payload posted from the operator wizard.
public record SaveCallOutcomeRequest(
    CallOutcome Outcome,
    string? AttemptNote,
    PartyRelation? PartyRelation,
    ActivityLevel? ActivityLevel,
    bool? WantsToBeActive,
    List<EngagementArea>? EngagementAreas,
    string? UpdatedPhone,
    string? UpdatedEmail,
    string? UpdatedAddress,
    string? SuggestionNote,
    bool? KnowsPotentialMembers,
    bool? WillingToEnroll);

public record MemberMatchDto(
    int MemberId,
    string DisplayName,
    string? PhoneNumber,
    string CommitteeName);

// Pre-fill payload handed to the Add-Member form on enrollment.
public record EnrollmentPrefillDto(
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? Email,
    string? City,
    int? MunicipalityId);
