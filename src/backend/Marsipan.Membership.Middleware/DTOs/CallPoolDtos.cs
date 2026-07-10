using Marsipan.Membership.Middleware.Enums;

namespace Marsipan.Membership.Middleware.DTOs;

public record CallPoolDto(
    int Id,
    string Name,
    int CampaignId,
    bool IsActive,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome,
    int ContactCount,
    List<PoolOperatorDto> Operators);

public record PoolOperatorDto(string UserId, string UserName);

public record CreateCallPoolRequest(
    string Name,
    int CampaignId,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome);

public record UpdateCallPoolRequest(
    string Name,
    bool IsActive,
    string? FilterCity,
    int? FilterMunicipalityId,
    CallOutcome? FilterOutcome);

public record AssignOperatorsRequest(List<string> UserIds);

public record RefreshResultDto(int Added, int TotalInPool);
