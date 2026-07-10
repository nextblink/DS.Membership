namespace Marsipan.Membership.Middleware.DTOs;

public record CallCenterReportQuery(
    int? CampaignId,
    int? PoolId,
    DateTime? FromDate,
    DateTime? ToDate);

public record EngagementAreaCountDto(string Area, int Count);

public record SuggestionCountDto(string Suggestion, int Count);

public record CallCenterReportDto(
    int Contacted,
    int InvalidContacts,
    int ActiveMembers,
    int InactiveMembers,
    int Sympathizers,
    int NoCooperation,
    int InterestedInActivating,
    List<EngagementAreaCountDto> EngagementAreaCounts,
    List<SuggestionCountDto> TopSuggestions);
