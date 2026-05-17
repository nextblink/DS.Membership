# AI Form Scanning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual form data entry with AI extraction — operator uploads a photo of the paper "Евиденциони образац" form, Claude reads it, pre-fills the member creation form for review, and saves the image as an audit trail.

**Architecture:** New `FormExtractionService` calls the Claude API via plain `HttpClient` (no extra NuGet), returns `ExtractedFormDataDto`. Frontend navigates from `/forms/new` to `/members/new` passing extracted data + files in React Router state. MemberForm pre-fills fields, checks for duplicate JMBG, and after member save silently creates the Form record.

**Tech Stack:** .NET 10, C# `HttpClient`, Claude API (claude-3-5-haiku-20241022), React 19, React Router 7, i18next

---

## File Map

| File | Action |
|---|---|
| `src/backend/Marsipan.Membership.Middleware/Options/AnthropicOptions.cs` | **Create** — strongly-typed config |
| `src/backend/Marsipan.Membership.Middleware/Services/IFormExtractionService.cs` | **Create** — interface |
| `src/backend/Marsipan.Membership.Middleware/Services/FormExtractionService.cs` | **Create** — Claude API integration |
| `src/backend/Marsipan.Membership.Middleware/DTOs/FormDTOs.cs` | **Modify** — add ExtractedFormDataDto, ExtractedPhoneDto |
| `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs` | **Modify** — add POST /api/forms/extract |
| `src/backend/Marsipan.Membership.Web/Program.cs` | **Modify** — register service + options + HttpClient |
| `src/backend/Marsipan.Membership.Web/appsettings.Development.json` | **Modify** — add Anthropic section |
| `src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx` | **Modify** — extraction flow |
| `src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx` | **Modify** — pass location.state |
| `src/client/MembershipAdmin/src/pages/members/MemberForm.jsx` | **Modify** — pre-fill, JMBG check, post-save form |
| `src/client/MembershipAdmin/src/locales/en/forms.json` | **Modify** — new keys |
| `src/client/MembershipAdmin/src/locales/sr/forms.json` | **Modify** — new keys |

---

### Task 1: AnthropicOptions + configuration

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Options/AnthropicOptions.cs`
- Modify: `src/backend/Marsipan.Membership.Web/appsettings.Development.json`

- [ ] **Step 1: Create AnthropicOptions.cs**

```csharp
// src/backend/Marsipan.Membership.Middleware/Options/AnthropicOptions.cs
namespace Marsipan.Membership.Middleware.Options;

/// <summary>
/// Strongly-typed Anthropic API configuration bound from the "Anthropic" section.
/// </summary>
public class AnthropicOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "claude-3-5-haiku-20241022";
}
```

- [ ] **Step 2: Add Anthropic section to appsettings.Development.json**

Open `src/backend/Marsipan.Membership.Web/appsettings.Development.json` and add after the existing `"Jwt"` section:

```json
"Anthropic": {
  "ApiKey": "REPLACE_WITH_YOUR_ANTHROPIC_API_KEY",
  "Model": "claude-3-5-haiku-20241022"
}
```

- [ ] **Step 3: Commit**

```
git add src/backend/Marsipan.Membership.Middleware/Options/AnthropicOptions.cs
git add src/backend/Marsipan.Membership.Web/appsettings.Development.json
git commit -m "feat: add AnthropicOptions config for form extraction"
```

---

### Task 2: ExtractedFormDataDto

**Files:**
- Modify: `src/backend/Marsipan.Membership.Middleware/DTOs/FormDTOs.cs`

- [ ] **Step 1: Add DTOs at the bottom of FormDTOs.cs**

Append these two classes after the last existing class in the file:

```csharp
/// <summary>
/// Data extracted from a paper "Евиденциони образац" form by the Claude vision API.
/// All fields are nullable — null means Claude could not read that field.
/// </summary>
public class ExtractedFormDataDto
{
    // Member personal fields
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ParentName { get; set; }
    public string? DateOfBirth { get; set; }     // ISO date: YYYY-MM-DD
    public string? Jmbg { get; set; }
    public string? Gender { get; set; }           // "Male" | "Female"
    public string? PostalCode { get; set; }
    public string? IdCardNumber { get; set; }
    public string? City { get; set; }
    public string? Email { get; set; }
    public List<ExtractedPhoneDto> Phones { get; set; } = new();
    public string? MaritalStatus { get; set; }    // enum name: Single|Married|Divorced|Widowed
    public string? VotingPlace { get; set; }
    public int? VotingPlaceNumber { get; set; }
    public string? EducationLevel { get; set; }   // enum name: Primary|Secondary|Higher|University|Masters|Doctorate
    public string? Occupation { get; set; }
    public string? JobTitle { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyCity { get; set; }
    public bool? IsPublicCompany { get; set; }

    // Form record metadata (from the stamp in the top-right of the paper form)
    public string? FormNumber { get; set; }
    public string? FormDate { get; set; }         // ISO date: YYYY-MM-DD
    public string? OrgUnitName { get; set; }      // e.g. "Opštinski odbor Lazarevac"

    // Party function written on the form (e.g. "Član OO")
    public string? Function { get; set; }
}

public class ExtractedPhoneDto
{
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = "Mobile";   // "Mobile" | "Landline" | "Business"
}
```

- [ ] **Step 2: Build to verify**

```
dotnet build src/backend/Marsipan.Membership.Middleware
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 3: Commit**

```
git add src/backend/Marsipan.Membership.Middleware/DTOs/FormDTOs.cs
git commit -m "feat: add ExtractedFormDataDto and ExtractedPhoneDto"
```

---

### Task 3: IFormExtractionService + FormExtractionService

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Services/IFormExtractionService.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/FormExtractionService.cs`

- [ ] **Step 1: Create the interface**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IFormExtractionService.cs
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
```

- [ ] **Step 2: Create FormExtractionService.cs**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/FormExtractionService.cs
using System.Net.Http.Headers;
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

        // Convert image to base64
        using var ms = new MemoryStream();
        await image.CopyToAsync(ms, ct);
        var base64 = Convert.ToBase64String(ms.ToArray());
        var mediaType = image.ContentType ?? "image/jpeg";

        // Build the Claude API request payload
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

        // Claude may wrap JSON in markdown code fences — strip them
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
```

- [ ] **Step 3: Build to verify**

```
dotnet build src/backend/Marsipan.Membership.Middleware
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: Commit**

```
git add src/backend/Marsipan.Membership.Middleware/Services/IFormExtractionService.cs
git add src/backend/Marsipan.Membership.Middleware/Services/FormExtractionService.cs
git commit -m "feat: add FormExtractionService using Claude vision API"
```

---

### Task 4: Register service in DI

**Files:**
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`

- [ ] **Step 1: Add registrations to Program.cs**

Find the block that registers `IFormsService` (search for `AddScoped<IFormsService>`). Add these lines immediately before it:

```csharp
// --- Form AI extraction ---
builder.Services.Configure<AnthropicOptions>(
    builder.Configuration.GetSection("Anthropic"));
builder.Services.AddHttpClient<IFormExtractionService, FormExtractionService>();
// --- end Form AI extraction ---
```

Also add the using at the top of Program.cs if not already present:
```csharp
using Marsipan.Membership.Middleware.Options;
```

- [ ] **Step 2: Build the Web project**

```
dotnet build src/backend/Marsipan.Membership.Web
```
Expected: `Build succeeded.` (file lock errors are fine if backend is running — stop it first)

- [ ] **Step 3: Commit**

```
git add src/backend/Marsipan.Membership.Web/Program.cs
git commit -m "feat: register FormExtractionService in DI"
```

---

### Task 5: POST /api/forms/extract endpoint

**Files:**
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs`

- [ ] **Step 1: Inject IFormExtractionService in the controller constructor**

Find the constructor of `FormsController`. It currently injects `IFormsService`. Add `IFormExtractionService`:

```csharp
private readonly IFormsService _forms;
private readonly IFormExtractionService _extraction;

public FormsController(IFormsService forms, IFormExtractionService extraction)
{
    _forms = forms;
    _extraction = extraction;
}
```

- [ ] **Step 2: Add the extract endpoint**

Add this method to `FormsController`, after the existing `Create` action:

```csharp
/// <summary>
/// Sends a single form image to the Claude vision API and returns extracted member data.
/// Does not persist anything — stateless extraction only.
/// </summary>
[HttpPost("extract")]
[Consumes("multipart/form-data")]
[ProducesResponseType(typeof(ExtractedFormDataDto), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
public async Task<ActionResult<ExtractedFormDataDto>> Extract(
    [FromForm(Name = "file")] IFormFile? file,
    CancellationToken ct)
{
    if (file is null || file.Length == 0)
        return BadRequest(new { message = "An image file is required." });

    var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
    if (!allowed.Contains(file.ContentType?.ToLowerInvariant()))
        return BadRequest(new { message = "Only JPEG, PNG, and WebP images are supported." });

    try
    {
        var result = await _extraction.ExtractAsync(file, ct);
        return Ok(result);
    }
    catch (InvalidOperationException ex)
    {
        return UnprocessableEntity(new { message = ex.Message });
    }
}
```

Also add the using at the top of the file if not present:
```csharp
using Marsipan.Membership.Middleware.Services;
```

- [ ] **Step 3: Stop the running backend, then build and start**

```powershell
# Stop dotnet
Get-Process -Name dotnet -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Build
cd src/backend/Marsipan.Membership.Web
dotnet build
```
Expected: `Build succeeded. 0 Error(s)`

- [ ] **Step 4: Test the endpoint (requires Anthropic API key set)**

Start the backend:
```
dotnet run --launch-profile http
```

Then test with the example form image from docs:
```bash
curl -X POST http://localhost:5145/api/forms/extract \
  -H "Authorization: Bearer <your-jwt-token>" \
  -F "file=@docs/fromImage.jpg"
```
Expected: `200 OK` with JSON containing extracted fields like `firstName`, `lastName`, `jmbg`, etc.

- [ ] **Step 5: Commit**

```
git add src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs
git commit -m "feat: add POST /api/forms/extract endpoint"
```

---

### Task 6: Translation keys

**Files:**
- Modify: `src/client/MembershipAdmin/src/locales/en/forms.json`
- Modify: `src/client/MembershipAdmin/src/locales/sr/forms.json`

- [ ] **Step 1: Add keys to en/forms.json**

Merge these keys into the existing `"upload"` object and add the new `"extract"` object:

```json
"extract": {
  "button": "Extract from image",
  "loading": "Claude is reading the form…",
  "error": "Extraction failed. Please try again or enter details manually.",
  "manualEntry": "Enter manually instead",
  "retry": "Try again"
},
```

Also update `"upload"` → `"submit"` to remain as-is (it's used by the old FormsList QR upload path which is unchanged).

- [ ] **Step 2: Add keys to sr/forms.json**

```json
"extract": {
  "button": "Извуци са слике",
  "loading": "Claude чита образац…",
  "error": "Екстракција није успела. Покушајте поново или унесите податке ручно.",
  "manualEntry": "Уђи ручно",
  "retry": "Покушај поново"
},
```

- [ ] **Step 3: Commit**

```
git add src/client/MembershipAdmin/src/locales/en/forms.json
git add src/client/MembershipAdmin/src/locales/sr/forms.json
git commit -m "feat: add extraction translation keys for en and sr"
```

---

### Task 7: Redesign FormUpload.jsx

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx`

The current page collects metadata (formNumber, formDate, municipalBoard) and uploads files. Replace the submission flow: keep the image upload UX, replace the Submit button with an Extract button that calls `/api/forms/extract` and navigates to `/members/new` with extracted data and files in state.

- [ ] **Step 1: Replace the FormUpload.jsx content**

```jsx
// src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

export default function FormUpload() {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const toast = useToast()

  const [files, setFiles] = useState([])  // [{ id, file, previewUrl, name }]
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const dragIndex = useRef(null)

  function addFiles(fileList) {
    const next = []
    for (const f of fileList) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: ${t('forms:upload.validation.typeNotAllowed')}`)
        continue
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name}: ${t('forms:upload.validation.tooLarge')}`)
        continue
      }
      next.push({
        id: `${f.name}-${f.size}-${Date.now()}`,
        file: f,
        previewUrl: ACCEPTED.slice(0, 3).includes(f.type) ? URL.createObjectURL(f) : null,
        name: f.name,
      })
    }
    setFiles((prev) => [...prev, ...next])
  }

  const handleFiles = (e) => { if (e.target.files?.length) addFiles(e.target.files) }
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const handleDragStart = (idx) => { dragIndex.current = idx }
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = (idx) => {
    const from = dragIndex.current
    dragIndex.current = null
    if (from == null || from === idx) return
    setFiles((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }

  const onZoneDragEnter = (e) => { e.preventDefault(); setIsDragOver(true) }
  const onZoneDragLeave = (e) => { e.preventDefault(); setIsDragOver(false) }
  const onZoneDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
  }

  const handleExtract = async () => {
    if (files.length === 0) return
    setError(null)
    setExtracting(true)
    try {
      const fd = new FormData()
      fd.append('file', files[0].file, files[0].name)
      const res = await api.post('/api/forms/extract', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate('/members/new', {
        state: { extracted: res.data, files: files.map((f) => f.file) },
      })
    } catch (err) {
      const msg = err?.response?.data?.message || t('forms:extract.error')
      setError(msg)
      toast.error(msg)
    } finally {
      setExtracting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400 mb-6">
        {t('forms:upload.title')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={onZoneDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'
        }`}
      >
        <svg className="mx-auto mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('forms:upload.dropzone')}</p>
        <p className="mt-1 text-theme-xs text-gray-400">{t('forms:upload.dropzoneHint')}</p>
        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED.join(',')}
          className="hidden" onChange={handleFiles} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-theme-xs text-gray-500 dark:text-gray-400">
            {t('forms:upload.filesSelected', { count: files.length })}
          </p>
          <div className="flex flex-wrap gap-3">
            {files.map((f, idx) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-2 w-24"
              >
                {f.previewUrl ? (
                  <img src={f.previewUrl} alt={f.name} className="h-16 w-full object-cover rounded" />
                ) : (
                  <div className="flex h-16 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 text-theme-xs font-bold text-gray-500">PDF</div>
                )}
                <p className="mt-1 truncate text-[10px] text-gray-500">{f.name}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white text-xs leading-none hover:bg-error-600"
                >×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleExtract}
          disabled={files.length === 0 || extracting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {extracting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {t('forms:extract.loading')}
            </>
          ) : t('forms:extract.button')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="text-theme-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 underline"
        >
          {t('forms:extract.manualEntry')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build frontend**

```
cd src/client/MembershipAdmin
npm run build
```
Expected: `✓ built in ...`

- [ ] **Step 3: Commit**

```
git add src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx
git commit -m "feat: redesign FormUpload to use Claude AI extraction"
```

---

### Task 8: MemberCreate.jsx — pass location.state

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx`

- [ ] **Step 1: Update MemberCreate.jsx to read state and pass to MemberForm**

The existing `MemberCreate.jsx` submits to `POST /api/members` and handles the 409 case. We need to:
1. Read `location.state?.extracted` and `location.state?.files`
2. Pass them as props to `MemberForm`
3. After successful member creation, silently create the Form record if files were present

Replace the full file content:

```jsx
// src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'
import MemberForm from './MemberForm'

export default function MemberCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation(['members', 'common'])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const toast = useToast()

  // Data arriving from FormUpload.jsx after AI extraction
  const extracted = location.state?.extracted ?? null
  const scannedFiles = location.state?.files ?? null  // File[] from the upload

  async function onSubmit(payload) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post('/api/members', payload)
      const newId = res?.data?.id

      // Silently create the Form audit record if we came from scanning
      if (newId && scannedFiles?.length) {
        try {
          const fd = new FormData()
          if (extracted?.formNumber) fd.append('formNumber', extracted.formNumber)
          if (extracted?.formDate) fd.append('formDate', extracted.formDate)
          if (extracted?.orgUnitName) fd.append('municipalBoard', extracted.orgUnitName)
          fd.append('memberId', String(newId))
          scannedFiles.forEach((f) => fd.append('files', f, f.name))
          await api.post('/api/forms', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (formErr) {
          // Non-blocking — member was saved, Form record failure is logged
          console.error('Form audit record creation failed:', formErr)
        }
      }

      if (newId) navigate(`/members/${newId}`, { state: { toast: 'created' } })
      else navigate('/members')
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setError(t('members:validation.jmbgTaken'))
        toast.error(t('members:validation.jmbgTaken'))
      } else {
        const msg = err?.response?.data?.message || t('members:error.saveFailed')
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <h1 className="text-2xl font-semibold text-brand-500 dark:text-brand-400 mb-4">
        {t('members:newMember')}
      </h1>
      <MemberForm
        mode="create"
        initialExtracted={extracted}
        onSubmit={onSubmit}
        onCancel={() => navigate('/members')}
        submitError={error}
        submitting={submitting}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx
git commit -m "feat: MemberCreate reads extraction state and creates Form audit record"
```

---

### Task 9: MemberForm.jsx — pre-fill, JMBG check, extracted field markers

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberForm.jsx`

This is the largest change. Three additions:
1. Accept `initialExtracted` prop and pre-fill fields from it on mount
2. Visual marker for AI-filled fields (blue left border, removed on edit)
3. JMBG duplicate check on mount and on blur

- [ ] **Step 1: Add CSS for extracted fields to index.css**

Add to `src/client/MembershipAdmin/src/index.css`:

```css
.extracted-field {
  border-left: 3px solid #2E6BAD !important;
  background-color: rgba(46, 107, 173, 0.04);
}
```

- [ ] **Step 2: Add initialExtracted prop handling to MemberForm**

Find the `MemberForm` function signature. It currently accepts `{ mode, initialData, onSubmit, onCancel, submitError, submitting }`. Add `initialExtracted`:

```jsx
export default function MemberForm({ mode, initialData, initialExtracted, onSubmit, onCancel, submitError, submitting }) {
```

- [ ] **Step 3: Add extractedKeys state to track which fields were AI-filled**

Inside `MemberForm`, after the existing state declarations, add:

```jsx
// Track which fields came from AI extraction (for visual marker)
const [extractedKeys, setExtractedKeys] = useState(new Set())
```

- [ ] **Step 4: Add JMBG duplicate check function and state** *(must be defined before the useEffect in Step 5)*

Add state and function inside `MemberForm`, before the data-loading effects:

```jsx
const [jmbgWarning, setJmbgWarning] = useState(null)  // null | { id, fullName }
const jmbgTimer = useRef(null)

async function checkJmbgDuplicate(jmbg) {
  if (!jmbg || jmbg.length !== 13) { setJmbgWarning(null); return }
  try {
    const res = await api.get('/api/members', { params: { jmbg, pageSize: 1 } })
    const items = res.data?.items ?? []
    if (items.length > 0) {
      setJmbgWarning({ id: items[0].id, fullName: `${items[0].firstName} ${items[0].lastName}` })
    } else {
      setJmbgWarning(null)
    }
  } catch {
    setJmbgWarning(null)
  }
}
```

- [ ] **Step 5: Add useEffect to pre-fill from initialExtracted**

Add this `useEffect` after `checkJmbgDuplicate` (it calls it). It runs once on mount:

```jsx
useEffect(() => {
  if (!initialExtracted) return

  const e = initialExtracted
  const filled = new Set()

  function set(key, value) {
    if (value != null && value !== '') filled.add(key)
    return value ?? ''
  }

  // Build the phone list from extracted phones
  const phones = (e.phones ?? []).map((p, i) => ({
    id: `ext-${i}`,
    number: p.number ?? '',
    type: p.type ?? 'Mobile',
  }))
  if (phones.length > 0) filled.add('phones')

  setValues((prev) => ({
    ...prev,
    firstName:       set('firstName', e.firstName),
    lastName:        set('lastName', e.lastName),
    parentName:      set('parentName', e.parentName),
    dateOfBirth:     set('dateOfBirth', e.dateOfBirth),
    jmbg:            set('jmbg', e.jmbg),
    gender:          e.gender ?? prev.gender,
    postalCode:      set('postalCode', e.postalCode),
    idCardNumber:    set('idCardNumber', e.idCardNumber),
    city:            set('city', e.city),
    email:           set('email', e.email),
    phones:          phones.length > 0 ? phones : prev.phones,
    maritalStatus:   e.maritalStatus ?? prev.maritalStatus,
    votingPlaceNumber: e.votingPlaceNumber != null ? String(e.votingPlaceNumber) : prev.votingPlaceNumber,
    educationLevel:  e.educationLevel ?? prev.educationLevel,
    occupation:      set('occupation', e.occupation),
    jobTitle:        set('jobTitle', e.jobTitle),
    companyName:     set('companyName', e.companyName),
    companyCity:     set('companyCity', e.companyCity),
    membershipDate:  set('membershipDate', e.membershipDate),
  }))

  if (e.gender) filled.add('gender')
  if (e.maritalStatus) filled.add('maritalStatus')
  if (e.educationLevel) filled.add('educationLevel')
  if (e.votingPlaceNumber != null) filled.add('votingPlaceNumber')

  setExtractedKeys(filled)

  // Trigger JMBG check immediately if extracted
  if (e.jmbg) checkJmbgDuplicate(e.jmbg)
}, [initialExtracted])
```

- [ ] **Step 6: Hook JMBG check to onChange and onBlur**

Find the JMBG input in the form JSX. Add blur handler and inline check:

```jsx
<input
  type="text"
  value={values.jmbg}
  onChange={(e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 13)
    setValues({ ...values, jmbg: v })
    setExtractedKeys((prev) => { const s = new Set(prev); s.delete('jmbg'); return s })
    clearTimeout(jmbgTimer.current)
    jmbgTimer.current = setTimeout(() => checkJmbgDuplicate(v), 400)
  }}
  onBlur={() => checkJmbgDuplicate(values.jmbg)}
  maxLength={13}
  className={`... existing classes ... ${extractedKeys.has('jmbg') ? 'extracted-field' : ''}`}
/>
```

- [ ] **Step 7: Add JMBG warning banner**

Just above the form's Save button section, insert:

```jsx
{jmbgWarning && (
  <div className="rounded-lg border border-warning-300 dark:border-warning-600 bg-warning-50 dark:bg-warning-500/10 px-4 py-3 text-theme-sm text-warning-700 dark:text-warning-300 flex items-center justify-between">
    <span>
      {t('members:validation.jmbgExists', { name: jmbgWarning.fullName })}
    </span>
    <a
      href={`/members/${jmbgWarning.id}`}
      target="_blank"
      rel="noreferrer"
      className="ml-4 underline font-medium shrink-0"
    >
      {t('members:validation.viewMember')}
    </a>
  </div>
)}
```

- [ ] **Step 8: Apply extracted-field class to other inputs**

For each text input that can be pre-filled, add `${extractedKeys.has('fieldName') ? 'extracted-field' : ''}` to the className and clear the key from `extractedKeys` on `onChange`. Apply to: `firstName`, `lastName`, `parentName`, `dateOfBirth`, `postalCode`, `idCardNumber`, `city`, `email`, `occupation`, `jobTitle`, `companyName`, `companyCity`, `membershipDate`, `votingPlaceNumber`.

Pattern for each (example for `firstName`):
```jsx
onChange={(e) => {
  setValues({ ...values, firstName: e.target.value })
  setExtractedKeys((prev) => { const s = new Set(prev); s.delete('firstName'); return s })
}}
className={`... existing classes ... ${extractedKeys.has('firstName') ? 'extracted-field' : ''}`}
```

- [ ] **Step 9: Add missing translation keys for members**

In `src/client/MembershipAdmin/src/locales/sr/members.json` and `en/members.json`, add:

```json
"validation": {
  "jmbgExists": "Члан са овим ЈМБГ-ом постоји — {{name}}.",
  "viewMember": "Погледај члана"
}
```

English (`en/members.json`):
```json
"validation": {
  "jmbgExists": "A member with this JMBG already exists — {{name}}.",
  "viewMember": "View member"
}
```

- [ ] **Step 10: Build and verify**

```
cd src/client/MembershipAdmin
npm run build
```
Expected: `✓ built in ...`

- [ ] **Step 11: Commit**

```
git add src/client/MembershipAdmin/src/index.css
git add src/client/MembershipAdmin/src/pages/members/MemberForm.jsx
git add src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx
git add src/client/MembershipAdmin/src/locales/sr/members.json
git add src/client/MembershipAdmin/src/locales/en/members.json
git commit -m "feat: pre-fill member form from extraction, JMBG duplicate warning"
```

---

### Task 10: End-to-end test

- [ ] **Step 1: Set your Anthropic API key**

Edit `src/backend/Marsipan.Membership.Web/appsettings.Development.json`:
```json
"Anthropic": {
  "ApiKey": "sk-ant-api03-YOUR-REAL-KEY-HERE",
  "Model": "claude-3-5-haiku-20241022"
}
```

- [ ] **Step 2: Start the backend**

```powershell
cd src/backend/Marsipan.Membership.Web
dotnet run --launch-profile http
```

- [ ] **Step 3: Start the frontend**

```
cd src/client/MembershipAdmin
npm run dev
```

- [ ] **Step 4: Walk through the full flow**

1. Open `http://localhost:5180/forms/new`
2. Drop `docs/fromImage.jpg` into the upload zone
3. Click "Extract from image"
4. Verify the spinner appears with "Claude is reading the form…"
5. Verify navigation to `/members/new` with pre-filled fields (blue left border on AI-filled fields)
6. Verify: Miloš Topalović, JMBG 1406965710388, Sopić - Lazarevac, etc.
7. Verify no JMBG warning (member doesn't exist yet)
8. Click Save — verify member created, redirected to `/members/{id}`
9. Verify a Form record was created for the member (check `/forms` list)

- [ ] **Step 5: Test duplicate JMBG warning**

1. Go to `/forms/new` again, upload the same form image
2. After extraction, verify the yellow JMBG warning appears with a link to the existing member
3. Verify clicking "View member" opens the correct member page

- [ ] **Step 6: Test manual entry fallback**

1. Go to `/forms/new`
2. Click "Enter manually instead"
3. Verify navigation to `/members/new` with no pre-fill (no blue borders)

- [ ] **Step 7: Final commit**

```
git add -A
git commit -m "feat: complete AI form scanning — extraction, pre-fill, JMBG check, audit trail"
```
