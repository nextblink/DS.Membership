using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Marsipan.Membership.Middleware.DTOs;
using Marsipan.Membership.Middleware.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

public class FormExtractionService : IFormExtractionService
{
    private const string ApiUrl = "https://api.anthropic.com/v1/messages";
    private const string AnthropicVersion = "2023-06-01";

    private static readonly string ExtractionPrompt = """
        You are extracting data from a Serbian Democratic Party (Demokratska Stranka)
        membership registration form called "Evidencioni Obrazac" (Евиденциони образац).

        Extract all visible handwritten data from the form image and return a single JSON object
        with these exact camelCase keys. Use null for any field that is blank, illegible, or absent.

        {
          "firstName": (Ime field),
          "lastName": (Prezime field),
          "parentName": (Ime jednog roditelja),
          "dateOfBirth": (Datum rođenja — YYYY-MM-DD or null),
          "jmbg": (JMBG — 13 digit string, no spaces),
          "gender": (Pol — "Male" if M, "Female" if Ž or F),
          "postalCode": (Poštanski broj — string),
          "idCardNumber": (Broj lične karte),
          "city": (Mesto),
          "email": (E pošta),
          "phones": array of {"number": "...", "type": "Mobile"|"Landline"|"Business"},
          "maritalStatus": (Bračni status — see mapping below),
          "votingPlace": (Biračko mesto),
          "votingPlaceNumber": (Broj biračkog mesta — integer or null),
          "educationLevel": (Stručna sprema — see mapping below),
          "occupation": (Zanimanje),
          "jobTitle": (Radno mesto),
          "companyName": (Naziv firme),
          "companyCity": (Sedište firme),
          "isPublicCompany": null,
          "function": (Funkcija field),
          "membershipDate": (Datum pristupa at bottom — YYYY-MM-DD or null),
          "formNumber": (Br. from the stamp in the top-right corner),
          "formDate": (Datum from the stamp in the top-right corner — YYYY-MM-DD or null),
          "orgUnitName": (Organization name from the stamp, e.g. "Opštinski odbor Lazarevac")
        }

        Phone type mapping:
        - Fiksni telefon → "Landline"
        - Poslovni telefon → "Business"
        - Mobilni telefon → "Mobile"

        MaritalStatus mapping (return the English enum name):
        - Oženjen / Udata → "Married"
        - Neoženjen / Neudata / Slobodan / Slobodna → "Single"
        - Razveden / Razvedena → "Divorced"
        - Udovac / Udovica → "Widowed"

        EducationLevel mapping (return the English enum name):
        - Osnovna → "Primary"
        - Srednja → "Secondary"
        - Viša → "Higher"
        - Fakultet / Visoka → "University"
        - Master / Magistar → "Masters"
        - Doktorat → "Doctorate"

        Return ONLY the JSON object. No markdown code fences. No explanation. No extra text.
        """;

    private readonly HttpClient _http;
    private readonly AnthropicOptions _options;
    private readonly ILogger<FormExtractionService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public FormExtractionService(
        HttpClient http,
        IOptions<AnthropicOptions> options,
        ILogger<FormExtractionService> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<ExtractedFormDataDto> ExtractAsync(IFormFile image, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_options.ApiKey))
            throw new InvalidOperationException("Anthropic API key is not configured.");

        using var ms = new MemoryStream();
        await image.CopyToAsync(ms, ct);
        var base64 = Convert.ToBase64String(ms.ToArray());
        var mediaType = image.ContentType ?? "image/jpeg";

        var payload = new
        {
            model = _options.Model,
            max_tokens = 2048,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "image",
                            source = new
                            {
                                type = "base64",
                                media_type = mediaType,
                                data = base64
                            }
                        },
                        new
                        {
                            type = "text",
                            text = ExtractionPrompt
                        }
                    }
                }
            }
        };

        var requestJson = JsonSerializer.Serialize(payload);
        using var requestContent = new StringContent(requestJson, Encoding.UTF8, "application/json");

        using var request = new HttpRequestMessage(HttpMethod.Post, ApiUrl)
        {
            Content = requestContent
        };
        request.Headers.Add("x-api-key", _options.ApiKey);
        request.Headers.Add("anthropic-version", AnthropicVersion);

        using var response = await _http.SendAsync(request, ct);

        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("Claude API error {Status}: {Body}", response.StatusCode, errBody);
            throw new InvalidOperationException($"Claude API returned {(int)response.StatusCode}.");
        }

        var responseBody = await response.Content.ReadAsStringAsync(ct);
        var responseNode = JsonNode.Parse(responseBody);
        var textContent = responseNode?["content"]?[0]?["text"]?.GetValue<string>()
            ?? throw new InvalidOperationException("Claude returned an unexpected response format.");

        var json = textContent.Trim();
        if (json.StartsWith("```")) json = json.Split('\n', 2)[1];
        if (json.EndsWith("```")) json = json[..json.LastIndexOf("```")];
        json = json.Trim();

        try
        {
            return JsonSerializer.Deserialize<ExtractedFormDataDto>(json, JsonOpts)
                ?? new ExtractedFormDataDto();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Claude extraction response: {Json}", json);
            throw new InvalidOperationException("Claude returned data that could not be parsed.");
        }
    }
}
