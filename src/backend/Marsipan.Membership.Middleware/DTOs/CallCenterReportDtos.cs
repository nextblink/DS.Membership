using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record CallCenterReportQuery(
    int? CampaignId,
    int? PoolId,
    DateTime? FromDate,
    DateTime? ToDate);

/// <summary>
/// Area is the enum itself rather than its name so the client can translate it through
/// locales/*/enums.json (engagementArea.*) — the same path CallScript/ContactList use.
/// Serialized as the member name ("MunicipalBoard") by JsonStringEnumConverter.
/// </summary>
public record EngagementAreaCountDto(EngagementArea Area, int Count);

/// <summary>
/// One operator-recorded suggestion. Deliberately a flat list, not a grouped count: the
/// note is free text, so identical strings essentially never occur and a "most frequent
/// suggestions" tally would be a list of 1s (#88).
/// </summary>
public record SuggestionItemDto(
    int ContactId,
    string ContactName,
    string? MunicipalityName,
    DateTime? CalledAt,
    string Suggestion);

public record CallCenterReportDto(
    int Contacted,
    int InvalidContacts,
    int ActiveMembers,
    int InactiveMembers,
    int Sympathizers,
    int NoCooperation,
    int InterestedInActivating,
    List<EngagementAreaCountDto> EngagementAreaCounts,
    List<SuggestionItemDto> Suggestions,
    // Total matching suggestions before the SuggestionsCap cut — lets the UI say
    // "showing 500 of N" instead of silently truncating.
    int SuggestionsTotal);
