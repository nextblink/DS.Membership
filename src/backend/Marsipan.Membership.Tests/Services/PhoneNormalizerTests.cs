using Marsipan.Membership.Middleware.Services;

namespace Marsipan.Membership.Tests.Services;

public class PhoneNormalizerTests
{
    [Theory]
    // Bare national numbers: the imported form is missing the trunk zero.
    [InlineData("11675519", "011675519")]
    [InlineData("63533858", "063533858")]
    [InlineData("112135694", "0112135694")]
    [InlineData("1342191", "01342191")]
    // Country code without the plus.
    [InlineData("381641234567", "+381641234567")]
    [InlineData("00381641234567", "+381641234567")]
    // Separators and extensions.
    [InlineData("064/123-4567", "0641234567")]
    [InlineData("013310004 lok.656", "013310004")]
    public void Normalize_fixes_repairable_numbers(string input, string expected)
    {
        var result = PhoneNormalizer.Normalize(input, out var changed);

        Assert.Equal(expected, result);
        Assert.True(changed);
        Assert.True(PhoneNormalizer.IsValid(result));
    }

    [Theory]
    [InlineData("0641234567")]
    [InlineData("+381641234567")]
    public void Normalize_leaves_already_valid_numbers_alone(string input)
    {
        var result = PhoneNormalizer.Normalize(input, out var changed);

        Assert.Equal(input, result);
        Assert.False(changed);
    }

    [Theory]
    // Too short to be a national number even with the trunk zero — the area code was never
    // imported, so prefixing would invent a number rather than repair one.
    [InlineData("13865")]
    [InlineData("347255")]
    // Stripping the extension leaves only 6 digits, which is still short of a national number.
    [InlineData("310004 lok.656")]
    public void Normalize_leaves_numbers_missing_an_area_code_untouched(string input)
    {
        var result = PhoneNormalizer.Normalize(input, out var changed);

        Assert.Equal(input, result);
        Assert.False(changed);
        Assert.False(PhoneNormalizer.IsValid(result));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Normalize_passes_through_empty_values(string? input)
    {
        var result = PhoneNormalizer.Normalize(input, out var changed);

        Assert.Equal(input, result);
        Assert.False(changed);
        Assert.True(PhoneNormalizer.IsValid(result));
    }
}
