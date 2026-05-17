using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// EF Core-backed implementation of <see cref="IFunctionsService"/>.
/// </summary>
public class FunctionsService : IFunctionsService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _currentUser;

    public FunctionsService(ApplicationContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<FunctionDto>> ListAsync(CancellationToken ct = default)
    {
        return await _db.Functions
            .AsNoTracking()
            .OrderBy(f => f.Name)
            .Select(f => new FunctionDto { Id = f.Id, Name = f.Name })
            .ToListAsync(ct);
    }

    public async Task<FunctionDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.Functions
            .AsNoTracking()
            .Where(f => f.Id == id)
            .Select(f => new FunctionDto { Id = f.Id, Name = f.Name })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<FunctionDto> CreateAsync(CreateFunctionDto dto, CancellationToken ct = default)
    {
        var entity = new Function
        {
            Name = dto.Name,
            CreatedDate = DateTime.UtcNow,
            CreatedByUserId = _currentUser.Id ?? string.Empty,
        };

        _db.Functions.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new FunctionDto { Id = entity.Id, Name = entity.Name };
    }

    public async Task<bool> UpdateAsync(int id, UpdateFunctionDto dto, CancellationToken ct = default)
    {
        var entity = await _db.Functions.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (entity is null)
            return false;

        entity.Name = dto.Name;
        entity.LastModifiedDate = DateTime.UtcNow;
        entity.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Functions.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (entity is null)
            return false;

        var inUse = await _db.MemberFunctions.AnyAsync(mf => mf.FunctionId == id, ct);
        if (inUse)
            return false;

        entity.IsDeleted = true;
        entity.LastModifiedDate = DateTime.UtcNow;
        entity.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
