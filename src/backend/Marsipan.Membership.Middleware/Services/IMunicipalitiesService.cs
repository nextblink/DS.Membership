using Marsipan.Membership.Middleware.DTOs;

namespace Marsipan.Membership.Middleware.Services;

public interface IMunicipalitiesService
{
    Task<List<MunicipalityTreeDto>> GetTreeAsync();
    Task<MunicipalityDetailsDto> GetByIdAsync(int id);
    Task<MunicipalityDetailsDto> CreateAsync(CreateMunicipalityDto dto);
    Task UpdateAsync(int id, UpdateMunicipalityDto dto);
    Task DeleteAsync(int id);
    Task BulkCreateAsync(List<CreateMunicipalityDto> dtos);
}
