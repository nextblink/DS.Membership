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
    int PageSize = 20);

public record CallContactListItemDto(
    int Id,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? City,
    int? MunicipalityId,
    string? MunicipalityName,
    int CampaignId,
    int? PoolId,
    int AttemptCount,
    CallOutcome? LastOutcome,
    ContactFinalStatus? FinalStatus,
    int? MatchedMemberId,
    int? ConvertedMemberId,
    string? ImportedOutcome);

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
    string? ImportNote);

public record ImportResultDto(
    int Imported,
    int Skipped,
    List<string> Errors);

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
