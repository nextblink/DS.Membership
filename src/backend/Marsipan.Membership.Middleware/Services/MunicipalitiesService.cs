using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

public class MunicipalitiesService : IMunicipalitiesService
{
    private readonly ApplicationContext _context;

    public MunicipalitiesService(ApplicationContext context)
    {
        _context = context;
    }

    public async Task<List<MunicipalityTreeDto>> GetTreeAsync()
    {
        var all = await _context.Municipalities.ToListAsync();
        return BuildTree(all);
    }

    public async Task<MunicipalityDetailsDto> GetByIdAsync(int id)
    {
        var m = await _context.Municipalities.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Municipality {id} not found");
        return MapToDetailsDto(m);
    }

    public async Task<MunicipalityDetailsDto> CreateAsync(CreateMunicipalityDto dto)
    {
        var entity = new Municipality
        {
            Name = dto.Name,
            IsCity = dto.IsCity,
            ParentId = dto.ParentId,
            CreatedDate = DateTime.UtcNow
        };
        _context.Municipalities.Add(entity);
        await _context.SaveChangesAsync();
        return MapToDetailsDto(entity);
    }

    public async Task UpdateAsync(int id, UpdateMunicipalityDto dto)
    {
        var entity = await _context.Municipalities.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Municipality {id} not found");
        entity.Name = dto.Name;
        entity.IsCity = dto.IsCity;
        entity.ParentId = dto.ParentId;
        entity.LastModifiedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var entity = await _context.Municipalities.FirstOrDefaultAsync(x => x.Id == id)
            ?? throw new KeyNotFoundException($"Municipality {id} not found");

        // Check if it has children
        var hasChildren = await _context.Municipalities.AnyAsync(x => x.ParentId == id);
        if (hasChildren)
            throw new InvalidOperationException("Cannot delete municipality that has child municipalities");

        entity.IsDeleted = true;
        entity.LastModifiedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task BulkCreateAsync(List<CreateMunicipalityDto> dtos)
    {
        var entities = dtos.Select(dto => new Municipality
        {
            Name = dto.Name,
            IsCity = dto.IsCity,
            ParentId = dto.ParentId,
            CreatedDate = DateTime.UtcNow
        }).ToList();

        _context.Municipalities.AddRange(entities);
        await _context.SaveChangesAsync();
    }

    private MunicipalityDetailsDto MapToDetailsDto(Municipality m)
    {
        return new MunicipalityDetailsDto
        {
            Id = m.Id,
            Name = m.Name,
            IsCity = m.IsCity,
            ParentId = m.ParentId
        };
    }

    private List<MunicipalityTreeDto> BuildTree(List<Municipality> all)
    {
        var dict = all.ToDictionary(m => m.Id);
        var roots = all.Where(m => m.ParentId == null).ToList();

        return roots.Select(r => MapToTreeDto(r, dict)).ToList();
    }

    private MunicipalityTreeDto MapToTreeDto(Municipality m, Dictionary<int, Municipality> dict)
    {
        return new MunicipalityTreeDto
        {
            Id = m.Id,
            Name = m.Name,
            IsCity = m.IsCity,
            ParentId = m.ParentId,
            Children = m.Children.Select(c => MapToTreeDto(c, dict)).ToList()
        };
    }
}
