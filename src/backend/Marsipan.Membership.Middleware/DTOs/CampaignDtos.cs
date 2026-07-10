namespace Marsipan.Membership.Middleware.DTOs;

public record CampaignDto(
    int Id,
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive,
    int ContactCount);

public record CreateCampaignRequest(
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive);

public record UpdateCampaignRequest(
    string Name,
    string? Description,
    DateOnly? StartDate,
    bool IsActive);
