using System.Reflection;
using System.Text.Json;

namespace Marsipan.Membership.Middleware.Data;

internal static class SeedDataLoader
{
    private static readonly Assembly Asm = typeof(SeedDataLoader).Assembly;

    private static readonly JsonSerializerOptions Opts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static T Load<T>(string fileName)
    {
        var resourceName = Asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith(fileName, StringComparison.OrdinalIgnoreCase))
            ?? throw new FileNotFoundException($"Embedded seed resource '{fileName}' not found.");

        using var stream = Asm.GetManifestResourceStream(resourceName)!;
        return JsonSerializer.Deserialize<T>(stream, Opts)
            ?? throw new InvalidDataException($"Failed to deserialize seed resource '{fileName}'.");
    }
}
