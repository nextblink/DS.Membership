namespace Marsipan.Membership.Middleware.Services;

/// <summary>
/// Converts between Serbian Cyrillic and Serbian Latin scripts.
/// Used to make name searches script-agnostic: a query typed in either script
/// matches records stored in the other.
/// </summary>
public static class SerbianTransliteration
{
    // Ordered longest-first so digraphs are replaced before their components.
    private static readonly (string Cyr, string Lat)[] Map =
    [
        ("Љ", "Lj"), ("љ", "lj"),
        ("Њ", "Nj"), ("њ", "nj"),
        ("Џ", "Dž"), ("џ", "dž"),
        ("А", "A"),  ("а", "a"),
        ("Б", "B"),  ("б", "b"),
        ("В", "V"),  ("в", "v"),
        ("Г", "G"),  ("г", "g"),
        ("Д", "D"),  ("д", "d"),
        ("Ђ", "Đ"),  ("ђ", "đ"),
        ("Е", "E"),  ("е", "e"),
        ("Ж", "Ž"),  ("ж", "ž"),
        ("З", "Z"),  ("з", "z"),
        ("И", "I"),  ("и", "i"),
        ("Ј", "J"),  ("ј", "j"),
        ("К", "K"),  ("к", "k"),
        ("Л", "L"),  ("л", "l"),
        ("М", "M"),  ("м", "m"),
        ("Н", "N"),  ("н", "n"),
        ("О", "O"),  ("о", "o"),
        ("П", "P"),  ("п", "p"),
        ("Р", "R"),  ("р", "r"),
        ("С", "S"),  ("с", "s"),
        ("Т", "T"),  ("т", "t"),
        ("Ћ", "Ć"),  ("ћ", "ć"),
        ("У", "U"),  ("у", "u"),
        ("Ф", "F"),  ("ф", "f"),
        ("Х", "H"),  ("х", "h"),
        ("Ц", "C"),  ("ц", "c"),
        ("Ч", "Č"),  ("ч", "č"),
        ("Ш", "Š"),  ("ш", "š"),
    ];

    // Reverse map for Latin → Cyrillic (digraphs first).
    private static readonly (string Lat, string Cyr)[] LatToCyrMap;

    static SerbianTransliteration()
    {
        LatToCyrMap =
        [
            // Digraphs — must come before single letters.
            ("LJ", "Љ"), ("Lj", "Љ"), ("lj", "љ"),
            ("NJ", "Њ"), ("Nj", "Њ"), ("nj", "њ"),
            ("DŽ", "Џ"), ("Dž", "Џ"), ("dž", "џ"),
            ("DZ", "Џ"), ("Dz", "Џ"), ("dz", "џ"), // common ASCII fallback
            // Singles
            ("A",  "А"), ("a",  "а"),
            ("B",  "Б"), ("b",  "б"),
            ("V",  "В"), ("v",  "в"),
            ("G",  "Г"), ("g",  "г"),
            ("D",  "Д"), ("d",  "д"),
            ("Đ",  "Ђ"), ("đ",  "ђ"), ("Dj", "Ђ"), ("dj", "ђ"),
            ("E",  "Е"), ("e",  "е"),
            ("Ž",  "Ж"), ("ž",  "ж"), ("Z",  "З"), ("z",  "з"),
            ("I",  "И"), ("i",  "и"),
            ("J",  "Ј"), ("j",  "ј"),
            ("K",  "К"), ("k",  "к"),
            ("L",  "Л"), ("l",  "л"),
            ("M",  "М"), ("m",  "м"),
            ("N",  "Н"), ("n",  "н"),
            ("O",  "О"), ("o",  "о"),
            ("P",  "П"), ("p",  "п"),
            ("R",  "Р"), ("r",  "р"),
            ("S",  "С"), ("s",  "с"),
            ("T",  "Т"), ("t",  "т"),
            ("Ć",  "Ћ"), ("ć",  "ћ"), ("C",  "Ц"), ("c",  "ц"),
            ("Č",  "Ч"), ("č",  "ч"),
            ("U",  "У"), ("u",  "у"),
            ("F",  "Ф"), ("f",  "ф"),
            ("H",  "Х"), ("h",  "х"),
            ("Š",  "Ш"), ("š",  "ш"),
        ];
    }

    public static string ToLatin(string cyr)
    {
        if (string.IsNullOrEmpty(cyr)) return cyr;
        var result = cyr;
        foreach (var (c, l) in Map)
            result = result.Replace(c, l, StringComparison.Ordinal);
        return result;
    }

    public static string ToCyrillic(string lat)
    {
        if (string.IsNullOrEmpty(lat)) return lat;
        var result = lat;
        foreach (var (l, c) in LatToCyrMap)
            result = result.Replace(l, c, StringComparison.Ordinal);
        return result;
    }

    /// <summary>
    /// Returns the original query plus its transliterated counterpart.
    /// If the query is already both scripts (mixed), returns only the original.
    /// Deduplicates — returns a single-element array when both variants are identical.
    /// </summary>
    public static string[] GetVariants(string query)
    {
        if (string.IsNullOrWhiteSpace(query)) return [query];
        var toLat = ToLatin(query);
        var toCyr = ToCyrillic(query);
        // If query is Cyrillic, toLat differs; add it. If Latin, toCyr differs; add it.
        var variants = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { query };
        if (toLat != query) variants.Add(toLat);
        if (toCyr != query) variants.Add(toCyr);
        return [.. variants];
    }
}
