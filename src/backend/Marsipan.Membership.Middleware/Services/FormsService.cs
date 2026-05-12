using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// EF Core-backed implementation of <see cref="IFormsService"/>. Centralises
/// scope filtering (<see cref="ScopeFilters.ApplyFormScope"/>), CreatedBy
/// bookkeeping, and the orchestration of <see cref="IFormImageStorage"/>
/// for multipart upload and cascade cleanup on soft-delete.
/// </summary>
public class FormsService : IFormsService
{
    private readonly ApplicationContext _db;
    private readonly ICurrentUserContext _user;
    private readonly IFormImageStorage _storage;

    public FormsService(
        ApplicationContext db,
        ICurrentUserContext user,
        IFormImageStorage storage)
    {
        _db = db;
        _user = user;
        _storage = storage;
    }

    public async Task<PagedResultDto<FormListItemDto>> SearchAsync(FormQuery q, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(q);

        var page = q.Page < 1 ? 1 : q.Page;
        var pageSize = q.PageSize switch
        {
            < 1 => 20,
            > 200 => 200,
            _ => q.PageSize
        };

        var query = _db.Forms
            .AsNoTracking()
            .Where(f => !f.IsDeleted)
            .ApplyFormScope(_user);

        if (!string.IsNullOrWhiteSpace(q.FormNumber))
        {
            var fn = q.FormNumber.Trim();
            query = query.Where(f => f.FormNumber != null && f.FormNumber.Contains(fn));
        }

        if (q.OrgUnitId is int orgUnitId)
        {
            query = query.Where(f => f.Member!.OrgUnitId == orgUnitId);
        }

        if (q.Status is FormStatus status)
        {
            query = query.Where(f => f.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(q.MemberName))
        {
            var name = q.MemberName.Trim();
            query = query.Where(f => f.Member != null &&
                ((f.Member.FirstName + " " + f.Member.LastName).Contains(name)
                 || f.Member.FirstName.Contains(name)
                 || f.Member.LastName.Contains(name)));
        }

        var totalCount = await query.CountAsync(ct);

        var rows = await query
            .OrderByDescending(f => f.CreatedDate)
            .ThenByDescending(f => f.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new FormListItemDto
            {
                Id = f.Id,
                FormNumber = f.FormNumber,
                MemberFullName = f.Member != null
                    ? (f.Member.FirstName + " " + f.Member.LastName)
                    : null,
                OrgUnitId = f.Member != null ? (int?)f.Member.OrgUnitId : null,
                OrgUnitName = f.Member != null && f.Member.OrgUnit != null
                    ? f.Member.OrgUnit.Name
                    : null,
                Status = f.Status.ToString(),
                CreatedByUserId = f.CreatedByUserId,
                CreatedByEmail = f.CreatedBy != null ? f.CreatedBy.Email : null
            })
            .ToListAsync(ct);

        var totalPages = pageSize == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedResultDto<FormListItemDto>
        {
            Items = rows,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = totalPages
        };
    }

    public async Task<FormDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var form = await _db.Forms
            .AsNoTracking()
            .Where(f => !f.IsDeleted && f.Id == id)
            .ApplyFormScope(_user)
            .Include(f => f.Member)!.ThenInclude(m => m!.OrgUnit)
            .Include(f => f.CreatedBy)
            .Include(f => f.Images)
            .FirstOrDefaultAsync(ct);

        return form is null ? null : ToDetails(form);
    }

    public async Task<FormDetailsDto> CreateAsync(
        CreateFormMetadataDto meta,
        IEnumerable<IFormFile> files,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(meta);
        ArgumentNullException.ThrowIfNull(files);

        if (!_user.IsAuthenticated || string.IsNullOrEmpty(_user.Id))
            throw new InvalidOperationException("Cannot create a form without an authenticated user.");

        // Server-side CreatedByUserId — never trust client input.
        var form = new Form
        {
            FormNumber = meta.FormNumber,
            FormDate = meta.FormDate,
            MunicipalBoard = meta.MunicipalBoard,
            MemberId = meta.MemberId,
            Status = FormStatus.Pending,
            CreatedByUserId = _user.Id!,
            CreatedDate = DateTime.UtcNow,
            IsDeleted = false
        };

        _db.Forms.Add(form);
        await _db.SaveChangesAsync(ct);

        var fileList = files.Where(f => f is not null && f.Length > 0).ToList();
        var order = 0;
        foreach (var file in fileList)
        {
            var (fileName, filePath) = await _storage.SaveAsync(form.Id, file, order, ct);
            _db.FormImages.Add(new FormImage
            {
                FormId = form.Id,
                FileName = fileName,
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow,
                Order = order,
                CreatedDate = DateTime.UtcNow,
                CreatedByUserId = _user.Id,
                IsDeleted = false
            });
            order++;
        }

        if (fileList.Count > 0)
            await _db.SaveChangesAsync(ct);

        // Re-read so navigation properties (Member/OrgUnit/CreatedBy) populate.
        var reloaded = await _db.Forms
            .AsNoTracking()
            .Where(f => f.Id == form.Id)
            .Include(f => f.Member)!.ThenInclude(m => m!.OrgUnit)
            .Include(f => f.CreatedBy)
            .Include(f => f.Images)
            .FirstAsync(ct);

        return ToDetails(reloaded);
    }

    public async Task<bool> UpdateAsync(int id, UpdateFormDto dto, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        var form = await _db.Forms
            .Where(f => !f.IsDeleted && f.Id == id)
            .ApplyFormScope(_user)
            .FirstOrDefaultAsync(ct);

        if (form is null) return false;

        form.FormNumber = dto.FormNumber;
        form.FormDate = dto.FormDate;
        form.MunicipalBoard = dto.MunicipalBoard;
        form.MemberId = dto.MemberId;
        form.LastModifiedDate = DateTime.UtcNow;
        form.LastModifiedByUserId = _user.Id;
        // CreatedByUserId is intentionally NOT touched.

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SetStatusAsync(int id, FormStatus status, CancellationToken ct = default)
    {
        var form = await _db.Forms
            .Where(f => !f.IsDeleted && f.Id == id)
            .ApplyFormScope(_user)
            .FirstOrDefaultAsync(ct);

        if (form is null) return false;

        form.Status = status;
        form.LastModifiedDate = DateTime.UtcNow;
        form.LastModifiedByUserId = _user.Id;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default)
    {
        var form = await _db.Forms
            .Where(f => !f.IsDeleted && f.Id == id)
            .ApplyFormScope(_user)
            .Include(f => f.Images)
            .FirstOrDefaultAsync(ct);

        if (form is null) return false;

        form.IsDeleted = true;
        form.LastModifiedDate = DateTime.UtcNow;
        form.LastModifiedByUserId = _user.Id;

        foreach (var img in form.Images)
        {
            img.IsDeleted = true;
            img.LastModifiedDate = DateTime.UtcNow;
            img.LastModifiedByUserId = _user.Id;
        }

        await _db.SaveChangesAsync(ct);

        // Cascade-delete files from disk. Idempotent.
        await _storage.DeleteAllForFormAsync(form.Id, ct);
        return true;
    }

    public async Task<IReadOnlyList<FormImageDto>> AddImagesAsync(
        int formId,
        IEnumerable<IFormFile> files,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(files);

        var form = await _db.Forms
            .Where(f => !f.IsDeleted && f.Id == formId)
            .ApplyFormScope(_user)
            .FirstOrDefaultAsync(ct);

        if (form is null) return Array.Empty<FormImageDto>();

        var currentMaxOrder = await _db.FormImages
            .Where(i => i.FormId == form.Id && !i.IsDeleted)
            .Select(i => (int?)i.Order)
            .MaxAsync(ct) ?? -1;

        var added = new List<FormImage>();
        var nextOrder = currentMaxOrder + 1;

        foreach (var file in files.Where(f => f is not null && f.Length > 0))
        {
            var (fileName, filePath) = await _storage.SaveAsync(form.Id, file, nextOrder, ct);
            var image = new FormImage
            {
                FormId = form.Id,
                FileName = fileName,
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow,
                Order = nextOrder,
                CreatedDate = DateTime.UtcNow,
                CreatedByUserId = _user.Id,
                IsDeleted = false
            };
            _db.FormImages.Add(image);
            added.Add(image);
            nextOrder++;
        }

        if (added.Count > 0)
            await _db.SaveChangesAsync(ct);

        return added.Select(ToImageDto).ToList();
    }

    public Task<FormImageDto> AddImageAsync(int formId, IFormFile file, CancellationToken ct = default)
        => AddSingleImageAsync(formId, file, ct);

    private async Task<FormImageDto> AddSingleImageAsync(int formId, IFormFile file, CancellationToken ct)
    {
        var dtos = await AddImagesAsync(formId, new[] { file }, ct);
        return dtos.Count > 0
            ? dtos[0]
            : throw new InvalidOperationException("Image was not added (form not found or file invalid).");
    }

    public async Task<bool> RemoveImageAsync(int formId, int imageId, CancellationToken ct = default)
    {
        // First ensure caller can see the form under scope.
        var form = await _db.Forms
            .Where(f => !f.IsDeleted && f.Id == formId)
            .ApplyFormScope(_user)
            .FirstOrDefaultAsync(ct);

        if (form is null) return false;

        var image = await _db.FormImages
            .Where(i => !i.IsDeleted && i.Id == imageId && i.FormId == form.Id)
            .FirstOrDefaultAsync(ct);

        if (image is null) return false;

        image.IsDeleted = true;
        image.LastModifiedDate = DateTime.UtcNow;
        image.LastModifiedByUserId = _user.Id;
        await _db.SaveChangesAsync(ct);

        await _storage.DeleteAsync(image.FilePath, ct);
        return true;
    }

    // ---- mapping helpers ----

    private static FormDetailsDto ToDetails(Form f) => new()
    {
        Id = f.Id,
        FormNumber = f.FormNumber,
        FormDate = f.FormDate,
        MunicipalBoard = f.MunicipalBoard,
        MemberId = f.MemberId,
        Member = f.Member is null ? null : new FormMemberSummaryDto
        {
            Id = f.Member.Id,
            FirstName = f.Member.FirstName,
            LastName = f.Member.LastName,
            JMBG = f.Member.JMBG,
            OrgUnitId = f.Member.OrgUnitId,
            OrgUnitName = f.Member.OrgUnit?.Name
        },
        Status = f.Status,
        CreatedByUserId = f.CreatedByUserId,
        CreatedByEmail = f.CreatedBy?.Email,
        CreatedDate = f.CreatedDate,
        LastModifiedDate = f.LastModifiedDate,
        Images = f.Images
            .Where(i => !i.IsDeleted)
            .OrderBy(i => i.Order)
            .ThenBy(i => i.Id)
            .Select(ToImageDto)
            .ToList()
    };

    private static FormImageDto ToImageDto(FormImage i) => new()
    {
        Id = i.Id,
        FileName = i.FileName,
        FilePath = i.FilePath,
        UploadedAt = i.UploadedAt,
        Order = i.Order
    };
}
