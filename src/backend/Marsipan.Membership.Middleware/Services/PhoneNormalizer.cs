namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Brings imported phone numbers to the house rule: every stored number starts with either
/// "0" (national trunk form) or "+381" (international form).
///
/// Imports arrive with the trunk zero stripped ("11675519", "63533858"), occasionally with
/// the country code but no plus ("381641234567"), and occasionally with an operator's
/// extension glued on ("310004 lok.656"). Anything that can't be made valid is returned
/// unchanged rather than guessed at — see <see cref="Normalize"/>.
/// </summary>
public static class PhoneNormalizer
{
    // A bare national number is 7-9 digits; prefixing the trunk zero yields the 8-10 digit
    // forms Serbian numbers actually take. Shorter values are local numbers whose area code
    // was never imported — no prefix can reconstruct them, so they're left alone.
    private const int MinBareLength = 7;
    private const int MaxBareLength = 9;

    /// <summary>
    /// Returns the normalized number, or the original trimmed value when it can't be fixed.
    /// <paramref name="changed"/> reports whether the value actually differs.
    /// </summary>
    public static string? Normalize(string? raw, out bool changed)
    {
        changed = false;
        if (string.IsNullOrWhiteSpace(raw)) return raw;

        var original = raw.Trim();

        // Drop anything from an extension marker onward ("310004 lok.656" -> "310004").
        var work = original;
        var lok = work.IndexOf("lok", StringComparison.OrdinalIgnoreCase);
        if (lok >= 0) work = work[..lok];

        var hadPlus = work.TrimStart().StartsWith('+');
        var digits = new string(work.Where(char.IsDigit).ToArray());
        if (digits.Length == 0) return original;

        string result;
        if (digits.StartsWith("00381", StringComparison.Ordinal))
        {
            result = "+381" + digits[5..];
        }
        else if (digits.StartsWith("381", StringComparison.Ordinal) && (hadPlus || digits.Length > 9))
        {
            // "381…" is only a country code when it's long enough to be one — otherwise it's
            // a local number that happens to begin with 381 (e.g. the 381xxx range).
            result = "+381" + digits[3..];
        }
        else if (digits.StartsWith('0'))
        {
            result = digits;
        }
        else if (digits.Length is >= MinBareLength and <= MaxBareLength)
        {
            result = "0" + digits;
        }
        else
        {
            // Too short (area code missing) or implausibly long — leave it for a human.
            return original;
        }

        changed = !string.Equals(result, original, StringComparison.Ordinal);
        return result;
    }

    /// <summary>True when the value already satisfies the rule (or is empty).</summary>
    public static bool IsValid(string? value) =>
        string.IsNullOrWhiteSpace(value)
        || value.StartsWith('0')
        || value.StartsWith("+381", StringComparison.Ordinal);
}
