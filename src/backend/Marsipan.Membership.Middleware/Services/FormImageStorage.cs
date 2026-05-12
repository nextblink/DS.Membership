using Marsipan.Membership.Middleware.Options;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Local-disk implementation of <see cref="IFormImageStorage"/>.
/// Files are written under <c>{ContentRoot}/{UploadRoot}/forms/{formId}/</c>.
/// </summary>
public class FormImageStorage : IFormImageStorage
{
    private readonly FileStorageOptions _options;
    private readonly IWebHostEnvironment _env;

    public FormImageStorage(IOptions<FileStorageOptions> options, IWebHostEnvironment env)
    {
        _options = options.Value;
        _env = env;
    }

    public async Task<(string FileName, string FilePath)> SaveAsync(
        int formId,
        IFormFile file,
        int order,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        if (file.Length <= 0)
            throw new FileStorageException("Uploaded file is empty.");

        if (file.Length > _options.MaxBytesPerFile)
            throw new FileStorageException(
                $"File '{file.FileName}' exceeds the maximum allowed size of {_options.MaxBytesPerFile} bytes.");

        var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrEmpty(ext) ||
            !_options.AllowedExtensions.Any(a => string.Equals(a, ext, StringComparison.OrdinalIgnoreCase)))
        {
            throw new FileStorageException(
                $"File extension '{ext}' is not allowed. Allowed: {string.Join(", ", _options.AllowedExtensions)}.");
        }

        var contentType = file.ContentType ?? string.Empty;
        if (!_options.AllowedMimeTypes.Any(m => string.Equals(m, contentType, StringComparison.OrdinalIgnoreCase)))
        {
            throw new FileStorageException(
                $"Content type '{contentType}' is not allowed. Allowed: {string.Join(", ", _options.AllowedMimeTypes)}.");
        }

        var fileName = $"{Guid.NewGuid():N}{ext}";

        // Relative path returned to caller / stored in FormImage.FilePath.
        var relativeDir = Path.Combine(_options.UploadRoot, "forms", formId.ToString());
        var relativePath = Path.Combine(relativeDir, fileName);

        // Absolute path used to actually write the file.
        var absoluteDir = Path.Combine(_env.ContentRootPath, relativeDir);
        var absolutePath = Path.Combine(absoluteDir, fileName);

        Directory.CreateDirectory(absoluteDir);

        await using (var stream = new FileStream(absolutePath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream, ct);
        }

        // Normalize to forward slashes so paths persisted in the DB are portable.
        var normalized = relativePath.Replace('\\', '/');
        return (fileName, normalized);
    }

    public Task DeleteAsync(string filePath, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            return Task.CompletedTask;

        var absolutePath = Path.IsPathRooted(filePath)
            ? filePath
            : Path.Combine(_env.ContentRootPath, filePath);

        try
        {
            if (File.Exists(absolutePath))
                File.Delete(absolutePath);
        }
        catch (FileNotFoundException)
        {
            // File already gone — swallow.
        }
        catch (DirectoryNotFoundException)
        {
            // Parent directory already gone — swallow.
        }

        return Task.CompletedTask;
    }

    public Task DeleteAllForFormAsync(int formId, CancellationToken ct = default)
    {
        var relativeDir = Path.Combine(_options.UploadRoot, "forms", formId.ToString());
        var absoluteDir = Path.Combine(_env.ContentRootPath, relativeDir);

        try
        {
            if (Directory.Exists(absoluteDir))
                Directory.Delete(absoluteDir, recursive: true);
        }
        catch (DirectoryNotFoundException)
        {
            // Already gone — idempotent.
        }

        return Task.CompletedTask;
    }
}
