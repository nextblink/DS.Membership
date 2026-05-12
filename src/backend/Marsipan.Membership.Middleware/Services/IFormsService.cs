using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Enums;
using Microsoft.AspNetCore.Http;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Application service for the Forms aggregate. Owns scope filtering,
/// CreatedBy bookkeeping, and the orchestration of <see cref="IFormImageStorage"/>
/// for multipart upload + cascade cleanup.
/// </summary>
public interface IFormsService
{
    Task<PagedResultDto<FormListItemDto>> SearchAsync(FormQuery q, CancellationToken ct = default);

    Task<FormDetailsDto?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<FormDetailsDto> CreateAsync(
        CreateFormMetadataDto meta,
        IEnumerable<IFormFile> files,
        CancellationToken ct = default);

    Task<bool> UpdateAsync(int id, UpdateFormDto dto, CancellationToken ct = default);

    Task<bool> SetStatusAsync(int id, FormStatus status, CancellationToken ct = default);

    Task<bool> SoftDeleteAsync(int id, CancellationToken ct = default);

    Task<IReadOnlyList<FormImageDto>> AddImagesAsync(
        int formId,
        IEnumerable<IFormFile> files,
        CancellationToken ct = default);

    Task<FormImageDto> AddImageAsync(int formId, IFormFile file, CancellationToken ct = default);

    Task<bool> RemoveImageAsync(int formId, int imageId, CancellationToken ct = default);
}
