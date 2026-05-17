using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <inheritdoc cref="ICommitteesService"/>
public class CommitteesService : ICommitteesService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _currentUser;

    public CommitteesService(ApplicationContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<List<CommitteeTreeDto>> GetTreeAsync(CancellationToken ct = default)
    {
        // Pull units + their member counts in one round trip. The soft-delete
        // query filter on OrgUnit already strips deleted rows.
        var units = await _db.Committees
            .AsNoTracking()
            .Where(o => o.Type == CommitteeType.City || o.Type == CommitteeType.Municipal)
            .Select(o => new
            {
                o.Id,
                o.Name,
                o.Type,
                o.ParentId,
                o.MunicipalityId,
                o.VoterCount,
                o.TrusteeId,
                o.IsTrustful,
                TrusteeName = o.Trustee != null ? o.Trustee.FirstName + " " + o.Trustee.LastName : null,
                MemberCount = _db.Members.Count(m => m.CommitteeId == o.Id),
            })
            .ToListAsync(ct);

        // Build a single pass dictionary, then stitch parent/child references.
        var nodes = units.ToDictionary(u => u.Id, u => new CommitteeTreeDto
        {
            Id = u.Id,
            Name = u.Name,
            Type = u.Type.ToString(),
            MunicipalityId = u.MunicipalityId,
            VoterCount = u.VoterCount,
            TrusteeId = u.TrusteeId,
            TrusteeName = u.TrusteeName,
            IsTrustful = u.IsTrustful,
            MemberCount = u.MemberCount,
            Children = new List<CommitteeTreeDto>(),
        });

        var roots = new List<CommitteeTreeDto>();
        foreach (var u in units)
        {
            var node = nodes[u.Id];
            if (u.ParentId is int pid && nodes.TryGetValue(pid, out var parent))
            {
                parent.Children.Add(node);
            }
            else
            {
                roots.Add(node);
            }
        }

        return roots;
    }

    public async Task<CommitteeDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _db.Committees
            .AsNoTracking()
            .Where(o => o.Id == id)
            .Select(o => new CommitteeDetailsDto
            {
                Id = o.Id,
                Name = o.Name,
                Type = o.Type,
                ParentId = o.ParentId,
                MunicipalityId = o.MunicipalityId,
                VoterCount = o.VoterCount,
                TrusteeId = o.TrusteeId,
                TrusteeName = o.Trustee != null ? o.Trustee.FirstName + " " + o.Trustee.LastName : null,
                IsTrustful = o.IsTrustful,
                MemberCount = _db.Members.Count(m => m.CommitteeId == o.Id),
            })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<CommitteeDetailsDto> CreateAsync(CreateCommitteeDto dto, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var now = DateTime.UtcNow;
        var entity = new Committee
        {
            Name = dto.Name,
            Type = dto.Type,
            ParentId = dto.ParentId,
            MunicipalityId = dto.MunicipalityId,
            VoterCount = dto.VoterCount,
            TrusteeId = dto.TrusteeId,
            IsTrustful = dto.IsTrustful,
            CreatedDate = now,
            CreatedByUserId = _currentUser.Id ?? string.Empty,
        };

        _db.Committees.Add(entity);
        await _db.SaveChangesAsync(ct);

        return new CommitteeDetailsDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Type = entity.Type,
            ParentId = entity.ParentId,
            MunicipalityId = entity.MunicipalityId,
            VoterCount = entity.VoterCount,
            TrusteeId = entity.TrusteeId,
            IsTrustful = entity.IsTrustful,
            MemberCount = 0,
        };
    }

    public async Task<bool> UpdateAsync(int id, UpdateCommitteeDto dto, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var entity = await _db.Committees.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (entity is null)
        {
            return false;
        }

        entity.Name = dto.Name;
        entity.Type = dto.Type;
        entity.ParentId = dto.ParentId;
        entity.MunicipalityId = dto.MunicipalityId;
        entity.VoterCount = dto.VoterCount;
        entity.TrusteeId = dto.TrusteeId;
        entity.IsTrustful = dto.IsTrustful;
        entity.LastModifiedDate = DateTime.UtcNow;
        entity.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.Committees.FirstOrDefaultAsync(o => o.Id == id, ct);
        if (entity is null)
        {
            return false;
        }

        // Refuse-on-children: safer than cascading, matches the OnDelete.Restrict
        // FK behavior already configured for the OrgUnit self-relationship.
        var hasChildren = await _db.Committees.AnyAsync(o => o.ParentId == id, ct);
        if (hasChildren)
        {
            return false;
        }

        entity.IsDeleted = true;
        entity.LastModifiedDate = DateTime.UtcNow;
        entity.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
