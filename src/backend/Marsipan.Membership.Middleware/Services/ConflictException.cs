namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Signals a business-rule conflict (e.g. duplicate JMBG). The Web layer maps
/// this to HTTP 409.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException() { }
    public ConflictException(string message) : base(message) { }
    public ConflictException(string message, Exception inner) : base(message, inner) { }
}
