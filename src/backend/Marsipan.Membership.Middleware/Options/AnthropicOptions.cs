namespace Marsipan.Membership.Middleware.Options;

/// <summary>
/// Strongly-typed Anthropic API configuration bound from the "Anthropic" section.
/// </summary>
public class AnthropicOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-3-5-haiku-20241022";
}
