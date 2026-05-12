using Microsoft.AspNetCore.Http;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Abstraction over local-disk storage for Form scan images.
/// Returned paths are relative to the application content root and are
/// suitable for persisting in <c>FormImage.FilePath</c>.
/// </summary>
public interface IFormImageStorage
{
    /// <summary>
    /// Validates and stores an uploaded file under
    /// <c>{UploadRoot}/forms/{formId}/{guid}{ext}</c>.
    /// </summary>
    /// <returns>
    /// The generated file name and the relative-to-content-root file path
    /// (e.g. <c>wwwroot/uploads/forms/42/abc123...jpg</c>).
    /// </returns>
    Task<(string FileName, string FilePath)> SaveAsync(
        int formId,
        IFormFile file,
        int order,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes a single stored file by its relative path. Safe to call when
    /// the file is already gone.
    /// </summary>
    Task DeleteAsync(string filePath, CancellationToken ct = default);

    /// <summary>
    /// Recursively removes the directory holding all files for the given
    /// form. Idempotent.
    /// </summary>
    Task DeleteAllForFormAsync(int formId, CancellationToken ct = default);
}
