using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Members aggregate service. Applies <see cref="ScopeFilters.ApplyMemberScope"/>
/// on every query, enforces JMBG uniqueness with <see cref="ConflictException"/>,
/// and stamps audit fields from the current user context.
/// </summary>
public class MembersService : IMembersService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _currentUser;

    public MembersService(ApplicationContext db, ICurrentUserContext currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<PagedResultDto<MemberListItemDto>> SearchAsync(MemberQuery q, CancellationToken ct = default)
    {
        var page = q.Page < 1 ? 1 : q.Page;
        var pageSize = q.PageSize < 1 ? 20 : (q.PageSize > 200 ? 200 : q.PageSize);

        var query = _db.Members
            .AsNoTracking()
            .ApplyMemberScope(_currentUser);

        if (!string.IsNullOrWhiteSpace(q.FirstName))
        {
            var f = q.FirstName.Trim();
            query = query.Where(m => EF.Functions.Like(m.FirstName, $"%{f}%"));
        }
        if (!string.IsNullOrWhiteSpace(q.LastName))
        {
            var l = q.LastName.Trim();
            query = query.Where(m => EF.Functions.Like(m.LastName, $"%{l}%"));
        }
        if (!string.IsNullOrWhiteSpace(q.JMBG))
        {
            var j = q.JMBG.Trim();
            query = query.Where(m => m.JMBG == j);
        }
        if (q.OrgUnitId.HasValue)
        {
            query = query.Where(m => m.OrgUnitId == q.OrgUnitId.Value);
        }
        if (q.FunctionId.HasValue)
        {
            var fnId = q.FunctionId.Value;
            query = query.Where(m => m.MemberFunctions.Any(mf => mf.FunctionId == fnId && !mf.IsDeleted));
        }
        if (q.EducationLevel.HasValue)
        {
            query = query.Where(m => m.EducationLevel == q.EducationLevel.Value);
        }
        if (q.Gender.HasValue)
        {
            query = query.Where(m => m.Gender == q.Gender.Value);
        }
        if (!string.IsNullOrWhiteSpace(q.Occupation))
        {
            var o = q.Occupation.Trim();
            query = query.Where(m => m.Occupation != null && EF.Functions.Like(m.Occupation, $"%{o}%"));
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderBy(m => m.LastName)
            .ThenBy(m => m.FirstName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MemberListItemDto
            {
                Id = m.Id,
                FullName = m.FirstName + " " + m.LastName,
                JMBG = m.JMBG,
                OrgUnitId = m.OrgUnitId,
                OrgUnitName = m.OrgUnit.Name,
                MembershipDate = m.MembershipDate,
                Gender = m.Gender.ToString(),
                Functions = m.MemberFunctions
                    .Where(mf => !mf.IsDeleted)
                    .Select(mf => mf.Function.Name)
                    .ToList(),
            })
            .ToListAsync(ct);

        var totalPages = pageSize == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResultDto<MemberListItemDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages,
        };
    }

    public async Task<MemberDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var member = await _db.Members
            .AsNoTracking()
            .ApplyMemberScope(_currentUser)
            .Include(m => m.OrgUnit)
            .Include(m => m.Phones.Where(p => !p.IsDeleted))
            .Include(m => m.MemberFunctions.Where(mf => !mf.IsDeleted))
                .ThenInclude(mf => mf.Function)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        return member is null ? null : MapDetails(member);
    }

    public async Task<MemberDetailsDto> CreateAsync(CreateMemberDto dto, CancellationToken ct = default)
    {
        // Explicit JMBG check first so we return 409 cleanly (DB also enforces unique index).
        // Use IgnoreQueryFilters so soft-deleted rows still trigger conflict.
        var jmbg = dto.JMBG?.Trim() ?? string.Empty;
        var exists = await _db.Members
            .IgnoreQueryFilters()
            .AnyAsync(m => m.JMBG == jmbg && !m.IsDeleted, ct);
        if (exists)
        {
            throw new ConflictException($"A member with JMBG '{jmbg}' already exists.");
        }

        var now = DateTime.UtcNow;
        var userId = _currentUser.Id ?? string.Empty;

        var member = new Member
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            ParentName = dto.ParentName,
            DateOfBirth = dto.DateOfBirth,
            JMBG = jmbg,
            Gender = dto.Gender,
            PostalCode = dto.PostalCode,
            IdCardNumber = dto.IdCardNumber,
            City = dto.City,
            Email = dto.Email,
            MaritalStatus = dto.MaritalStatus,
            VotingPlaceNumber = dto.VotingPlaceNumber,
            EducationLevel = dto.EducationLevel,
            CompanyName = dto.CompanyName,
            CompanyCity = dto.CompanyCity,
            IsPublicCompany = dto.IsPublicCompany,
            JobTitle = dto.JobTitle,
            Occupation = dto.Occupation,
            MembershipDate = dto.MembershipDate,
            OrgUnitId = dto.OrgUnitId,
            CreatedDate = now,
            CreatedByUserId = userId,
            LastModifiedDate = now,
            LastModifiedByUserId = userId,
        };

        foreach (var p in dto.Phones)
        {
            member.Phones.Add(new Phone
            {
                Number = p.Number,
                Type = p.Type,
                CreatedDate = now,
                CreatedByUserId = userId,
                LastModifiedDate = now,
                LastModifiedByUserId = userId,
            });
        }

        foreach (var fn in dto.Functions)
        {
            member.MemberFunctions.Add(new MemberFunction
            {
                FunctionId = fn.FunctionId,
                AssignedDate = fn.AssignedDate,
                CreatedDate = now,
                CreatedByUserId = userId,
                LastModifiedDate = now,
                LastModifiedByUserId = userId,
            });
        }

        _db.Members.Add(member);
        await _db.SaveChangesAsync(ct);

        // Re-fetch with includes so we can map the full details shape consistently.
        var created = await _db.Members
            .AsNoTracking()
            .Include(m => m.OrgUnit)
            .Include(m => m.Phones.Where(p => !p.IsDeleted))
            .Include(m => m.MemberFunctions.Where(mf => !mf.IsDeleted))
                .ThenInclude(mf => mf.Function)
            .FirstAsync(m => m.Id == member.Id, ct);

        return MapDetails(created);
    }

    public async Task<bool> UpdateAsync(int id, UpdateMemberDto dto, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (member is null)
        {
            return false;
        }

        var newJmbg = dto.JMBG?.Trim() ?? string.Empty;
        if (!string.Equals(member.JMBG, newJmbg, StringComparison.Ordinal))
        {
            var conflict = await _db.Members
                .IgnoreQueryFilters()
                .AnyAsync(m => m.JMBG == newJmbg && m.Id != id && !m.IsDeleted, ct);
            if (conflict)
            {
                throw new ConflictException($"A member with JMBG '{newJmbg}' already exists.");
            }
        }

        member.FirstName = dto.FirstName;
        member.LastName = dto.LastName;
        member.ParentName = dto.ParentName;
        member.DateOfBirth = dto.DateOfBirth;
        member.JMBG = newJmbg;
        member.Gender = dto.Gender;
        member.PostalCode = dto.PostalCode;
        member.IdCardNumber = dto.IdCardNumber;
        member.City = dto.City;
        member.Email = dto.Email;
        member.MaritalStatus = dto.MaritalStatus;
        member.VotingPlaceNumber = dto.VotingPlaceNumber;
        member.EducationLevel = dto.EducationLevel;
        member.CompanyName = dto.CompanyName;
        member.CompanyCity = dto.CompanyCity;
        member.IsPublicCompany = dto.IsPublicCompany;
        member.JobTitle = dto.JobTitle;
        member.Occupation = dto.Occupation;
        member.MembershipDate = dto.MembershipDate;
        member.OrgUnitId = dto.OrgUnitId;
        member.LastModifiedDate = DateTime.UtcNow;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == id, ct);
        if (member is null)
        {
            return false;
        }

        member.IsDeleted = true;
        member.LastModifiedDate = DateTime.UtcNow;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PhoneDto?> AddPhoneAsync(int memberId, AddPhoneDto dto, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var phone = new Phone
        {
            MemberId = memberId,
            Number = dto.Number,
            Type = dto.Type,
            CreatedDate = now,
            CreatedByUserId = _currentUser.Id ?? string.Empty,
        };

        _db.Phones.Add(phone);
        member.LastModifiedDate = now;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);

        return new PhoneDto
        {
            Id = phone.Id,
            Number = phone.Number,
            Type = phone.Type.ToString(),
        };
    }

    public async Task<bool> RemovePhoneAsync(int memberId, int phoneId, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null)
        {
            return false;
        }

        var phone = await _db.Phones
            .FirstOrDefaultAsync(p => p.Id == phoneId && p.MemberId == memberId && !p.IsDeleted, ct);
        if (phone is null)
        {
            return false;
        }

        var now = DateTime.UtcNow;
        phone.IsDeleted = true;
        phone.LastModifiedDate = now;
        phone.LastModifiedByUserId = _currentUser.Id ?? string.Empty;
        member.LastModifiedDate = now;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<MemberFunctionDto>?> ListFunctionsAsync(int memberId, CancellationToken ct = default)
    {
        var member = await _db.Members
            .AsNoTracking()
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null)
        {
            return null;
        }

        return await _db.MemberFunctions
            .AsNoTracking()
            .Where(mf => mf.MemberId == memberId && !mf.IsDeleted)
            .OrderBy(mf => mf.AssignedDate)
            .Select(mf => new MemberFunctionDto
            {
                Id = mf.Id,
                FunctionId = mf.FunctionId,
                FunctionName = mf.Function.Name,
                AssignedDate = mf.AssignedDate,
            })
            .ToListAsync(ct);
    }

    public async Task<MemberFunctionDto?> AddFunctionAsync(int memberId, AddMemberFunctionDto dto, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var mf = new MemberFunction
        {
            MemberId = memberId,
            FunctionId = dto.FunctionId,
            AssignedDate = dto.AssignedDate,
            CreatedDate = now,
            CreatedByUserId = _currentUser.Id ?? string.Empty,
        };

        _db.MemberFunctions.Add(mf);
        member.LastModifiedDate = now;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);

        var functionName = await _db.Functions
            .AsNoTracking()
            .Where(f => f.Id == dto.FunctionId)
            .Select(f => f.Name)
            .FirstOrDefaultAsync(ct) ?? string.Empty;

        return new MemberFunctionDto
        {
            Id = mf.Id,
            FunctionId = mf.FunctionId,
            FunctionName = functionName,
            AssignedDate = mf.AssignedDate,
        };
    }

    public async Task<bool> RemoveFunctionAsync(int memberId, int mfId, CancellationToken ct = default)
    {
        var member = await _db.Members
            .ApplyMemberScope(_currentUser)
            .FirstOrDefaultAsync(m => m.Id == memberId, ct);
        if (member is null)
        {
            return false;
        }

        var mf = await _db.MemberFunctions
            .FirstOrDefaultAsync(x => x.Id == mfId && x.MemberId == memberId && !x.IsDeleted, ct);
        if (mf is null)
        {
            return false;
        }

        var now = DateTime.UtcNow;
        mf.IsDeleted = true;
        mf.LastModifiedDate = now;
        mf.LastModifiedByUserId = _currentUser.Id ?? string.Empty;
        member.LastModifiedDate = now;
        member.LastModifiedByUserId = _currentUser.Id ?? string.Empty;

        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static MemberDetailsDto MapDetails(Member m)
    {
        return new MemberDetailsDto
        {
            Id = m.Id,
            FirstName = m.FirstName,
            LastName = m.LastName,
            ParentName = m.ParentName,
            DateOfBirth = m.DateOfBirth,
            JMBG = m.JMBG,
            Gender = m.Gender,
            PostalCode = m.PostalCode,
            IdCardNumber = m.IdCardNumber,
            City = m.City,
            Email = m.Email,
            MaritalStatus = m.MaritalStatus,
            VotingPlaceNumber = m.VotingPlaceNumber,
            EducationLevel = m.EducationLevel,
            CompanyName = m.CompanyName,
            CompanyCity = m.CompanyCity,
            IsPublicCompany = m.IsPublicCompany,
            JobTitle = m.JobTitle,
            Occupation = m.Occupation,
            MembershipDate = m.MembershipDate,
            OrgUnitId = m.OrgUnitId,
            OrgUnitName = m.OrgUnit?.Name ?? string.Empty,
            Phones = m.Phones
                .Where(p => !p.IsDeleted)
                .Select(p => new PhoneDto
                {
                    Id = p.Id,
                    Number = p.Number,
                    Type = p.Type.ToString(),
                })
                .ToList(),
            Functions = m.MemberFunctions
                .Where(mf => !mf.IsDeleted)
                .OrderBy(mf => mf.AssignedDate)
                .Select(mf => new MemberFunctionDto
                {
                    Id = mf.Id,
                    FunctionId = mf.FunctionId,
                    FunctionName = mf.Function?.Name ?? string.Empty,
                    AssignedDate = mf.AssignedDate,
                })
                .ToList(),
        };
    }
}
