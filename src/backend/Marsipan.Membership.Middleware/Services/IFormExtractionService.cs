using Marsipan.Membership.Middleware.DTOs;
using Microsoft.AspNetCore.Http;

namespace Marsipan.Membership.Middleware.Services;

public interface IFormExtractionService
{
    /// <summary>
    /// Sends the image to the Claude vision API and returns extracted member fields.
    /// Null fields in the result mean Claude could not read that field.
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when the API key is missing or Claude cannot process the image at all.</exception>
    Task<ExtractedFormDataDto> ExtractAsync(IFormFile image, CancellationToken ct = default);
}
