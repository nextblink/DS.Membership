namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Thrown when an uploaded file fails validation (size, extension, MIME).
/// Inherits from <see cref="InvalidOperationException"/> so callers that only
/// catch the base type still get the rejection.
/// </summary>
public class FileStorageException : InvalidOperationException
{
    public FileStorageException(string message) : base(message) { }
    public FileStorageException(string message, Exception inner) : base(message, inner) { }
}
