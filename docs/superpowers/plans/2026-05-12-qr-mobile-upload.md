# QR Mobile Upload — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in operator generate a QR code on their desktop that their phone can scan to upload form photos without a second login.

**Architecture:** A short-lived HMAC-SHA256 signed token (containing `userId + exp`) is issued to the authenticated operator and encoded into a QR URL. The mobile page at `/m/upload?token=…` is public, sends files to a new `[AllowAnonymous]` endpoint that validates the token and creates the `Form` record attributed to the operator. No new DB table — the token is stateless.

**Tech Stack:** .NET 10 (HMAC-SHA256, ASP.NET Core), `qrcode.react` (React QR display), plain `fetch` on the mobile page (no auth interceptor).

---

## File Map

| Action | Path |
|--------|------|
| CREATE | `src/backend/Marsipan.Membership.Middleware/Options/QrUploadOptions.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/Services/IQrTokenService.cs` |
| CREATE | `src/backend/Marsipan.Membership.Middleware/Services/QrTokenService.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Web/Program.cs` |
| MODIFY | `src/backend/Marsipan.Membership.Web/appsettings.Development.json` |
| MODIFY | `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs` |
| CREATE | `src/backend/Marsipan.Membership.Web/Controllers/PublicFormsController.cs` |
| MODIFY | `src/client/MembershipAdmin/package.json` (npm install) |
| MODIFY | `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx` |
| CREATE | `src/client/MembershipAdmin/src/pages/upload/MobileUpload.jsx` |
| MODIFY | `src/client/MembershipAdmin/src/services/router.jsx` |

---

## Task 1: Backend — QrUploadOptions, IQrTokenService, QrTokenService

**Files:**
- Create: `src/backend/Marsipan.Membership.Middleware/Options/QrUploadOptions.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/IQrTokenService.cs`
- Create: `src/backend/Marsipan.Membership.Middleware/Services/QrTokenService.cs`
- Modify: `src/backend/Marsipan.Membership.Web/Program.cs`
- Modify: `src/backend/Marsipan.Membership.Web/appsettings.Development.json`

- [ ] **Step 1: Create QrUploadOptions.cs**

```csharp
// src/backend/Marsipan.Membership.Middleware/Options/QrUploadOptions.cs
namespace Marsipan.Membership.Middleware.Options;

public class QrUploadOptions
{
    public string Secret { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Create IQrTokenService.cs**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/IQrTokenService.cs
namespace Marsipan.Membership.Middleware.Services;

public interface IQrTokenService
{
    /// <summary>Generates a signed upload token for the given user, valid until expiresAt.</summary>
    string GenerateToken(string userId, DateTimeOffset expiresAt);

    /// <summary>Validates the token. Returns (true, userId) if valid, (false, null) otherwise.</summary>
    (bool Valid, string? UserId) ValidateToken(string token);
}
```

- [ ] **Step 3: Create QrTokenService.cs**

```csharp
// src/backend/Marsipan.Membership.Middleware/Services/QrTokenService.cs
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Marsipan.Membership.Middleware.Options;
using Microsoft.Extensions.Options;

namespace Marsipan.Membership.Middleware.Services;

public class QrTokenService : IQrTokenService
{
    private readonly QrUploadOptions _options;

    public QrTokenService(IOptions<QrUploadOptions> options)
    {
        _options = options.Value;
    }

    public string GenerateToken(string userId, DateTimeOffset expiresAt)
    {
        var payload = new QrTokenPayload
        {
            UserId = userId,
            Exp = expiresAt.ToUnixTimeSeconds()
        };
        var payloadBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(payload));
        var payloadB64 = Base64UrlEncode(payloadBytes);
        var sig = ComputeHmac(payloadB64);
        return $"{payloadB64}.{sig}";
    }

    public (bool Valid, string? UserId) ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return (false, null);

        var parts = token.Split('.');
        if (parts.Length != 2) return (false, null);

        // Verify signature first (constant-time comparison prevents timing attacks).
        var expectedSig = ComputeHmac(parts[0]);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSig),
                Encoding.UTF8.GetBytes(parts[1])))
            return (false, null);

        try
        {
            var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            var payload = JsonSerializer.Deserialize<QrTokenPayload>(json);
            if (payload is null) return (false, null);
            if (DateTimeOffset.FromUnixTimeSeconds(payload.Exp) <= DateTimeOffset.UtcNow)
                return (false, null);
            return (true, payload.UserId);
        }
        catch
        {
            return (false, null);
        }
    }

    private string ComputeHmac(string data)
    {
        var key = Encoding.UTF8.GetBytes(_options.Secret);
        var bytes = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(data));
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        s += (s.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(s);
    }
}

internal record QrTokenPayload
{
    [JsonPropertyName("userId")] public string UserId { get; init; } = string.Empty;
    [JsonPropertyName("exp")]    public long Exp    { get; init; }
}
```

- [ ] **Step 4: Register in Program.cs**

Find the block where other services are registered (e.g. near `builder.Services.AddScoped<IFormsService, FormsService>()`). Add:

```csharp
builder.Services.Configure<QrUploadOptions>(builder.Configuration.GetSection("QrUpload"));
builder.Services.AddSingleton<IQrTokenService, QrTokenService>();
```

Also find the existing `builder.Services.AddCors(...)` call and replace it so there are **two** named policies — the existing one for the frontend, plus a new one for the anonymous upload endpoint:

```csharp
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5180")
              .AllowAnyMethod()
              .AllowAnyHeader());

    // Public upload endpoint must be reachable from mobile on the LAN (any origin).
    opts.AddPolicy("PublicUpload", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});
```

Then change `app.UseCors()` (the parameterless call) to `app.UseCors("AllowFrontend")`.

- [ ] **Step 5: Add QrUpload config to appsettings.Development.json**

Open `src/backend/Marsipan.Membership.Web/appsettings.Development.json` and add at the top level:

```json
"QrUpload": {
  "Secret": "DEV_QR_SECRET_REPLACE_IN_PROD_MIN32CHARS!!"
}
```

- [ ] **Step 6: Build to verify no compile errors**

```
dotnet build src/backend/Marsipan.Membership.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 7: Commit**

```
git add src/backend/
git commit -m "feat: QrTokenService + QrUploadOptions foundation"
```

---

## Task 2: Backend — GenerateQrToken endpoint

**Files:**
- Modify: `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs`

- [ ] **Step 1: Inject IQrTokenService and JwtOptions into FormsController**

In `FormsController.cs`, add to the constructor parameters:

```csharp
private readonly IQrTokenService _qrTokenService;
private readonly JwtOptions _jwtOptions;
```

Add to constructor signature and assignment (alongside the existing injections):

```csharp
IQrTokenService qrTokenService,
IOptions<JwtOptions> jwtOptions,
// ... existing parameters
```

```csharp
_qrTokenService = qrTokenService;
_jwtOptions = jwtOptions.Value;
```

Add the missing using at the top:
```csharp
using Marsipan.Membership.Middleware.Options;
using Marsipan.Membership.Middleware.Services;
using Microsoft.Extensions.Options;
```

- [ ] **Step 2: Add GenerateQrToken action**

Add the following action inside `FormsController` (any position, e.g. after the last action):

```csharp
/// <summary>
/// Issues a short-lived upload token the operator can embed in a QR code.
/// Expiry matches the configured JWT lifetime so the QR stops working when
/// the operator's session would have expired anyway.
/// </summary>
[HttpPost("qr-token")]
public IActionResult GenerateQrToken()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userId))
        return Unauthorized();

    var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_jwtOptions.ExpiresMinutes);
    var token = _qrTokenService.GenerateToken(userId, expiresAt);

    return Ok(new
    {
        token,
        expiresAt = expiresAt.ToString("O") // ISO 8601
    });
}
```

Ensure `using System.Security.Claims;` is present at the top of the file.

- [ ] **Step 3: Build**

```
dotnet build src/backend/Marsipan.Membership.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Smoke-test with curl (optional)**

```bash
# Login first to get a token, then:
curl -X POST http://localhost:5145/api/forms/qr-token \
  -H "Authorization: Bearer <your_jwt>"
# Expected: { "token": "...", "expiresAt": "..." }
```

- [ ] **Step 5: Commit**

```
git add src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs
git commit -m "feat: POST /api/forms/qr-token endpoint"
```

---

## Task 3: Backend — PublicFormsController

**Files:**
- Create: `src/backend/Marsipan.Membership.Web/Controllers/PublicFormsController.cs`

- [ ] **Step 1: Create PublicFormsController.cs**

```csharp
// src/backend/Marsipan.Membership.Web/Controllers/PublicFormsController.cs
using Marsipan.Membership.Middleware.Data;
using Marsipan.Membership.Middleware.Entities;
using Marsipan.Membership.Middleware.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace Marsipan.Membership.Web.Controllers;

[ApiController]
[Route("api/public/forms")]
[AllowAnonymous]
[EnableCors("PublicUpload")]
public class PublicFormsController : ControllerBase
{
    private readonly IQrTokenService _qrTokenService;
    private readonly IFormImageStorage _imageStorage;
    private readonly AppDbContext _db;

    public PublicFormsController(
        IQrTokenService qrTokenService,
        IFormImageStorage imageStorage,
        AppDbContext db)
    {
        _qrTokenService = qrTokenService;
        _imageStorage = imageStorage;
        _db = db;
    }

    /// <summary>
    /// Anonymous form upload via QR token. Accepts one or more image files,
    /// creates a Pending form attributed to the token's operator.
    /// </summary>
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromQuery] string token,
        IList<IFormFile>? files,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest(new { message = "Upload token is required." });

        var (valid, userId) = _qrTokenService.ValidateToken(token);
        if (!valid || string.IsNullOrEmpty(userId))
            return BadRequest(new { message = "Invalid or expired upload token." });

        if (files == null || files.Count == 0)
            return BadRequest(new { message = "At least one file is required." });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            // Create the form record first so we have an ID for image paths.
            var form = new Form
            {
                ScanDate = DateOnly.FromDateTime(DateTime.Today),
                Status = FormStatus.Pending,
                CreatedByUserId = userId,
            };
            _db.Forms.Add(form);
            await _db.SaveChangesAsync(ct);

            // Save each file and record its metadata.
            for (var i = 0; i < files.Count; i++)
            {
                var (fileName, filePath) = await _imageStorage.SaveAsync(form.Id, files[i], i, ct);
                _db.FormImages.Add(new FormImage
                {
                    FormId = form.Id,
                    FileName = fileName,
                    FilePath = filePath,
                    Order = i,
                });
            }
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return Ok(new { formId = form.Id });
        }
        catch (FileStorageException ex)
        {
            await tx.RollbackAsync(ct);
            return BadRequest(new { message = ex.Message });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            return StatusCode(500, new { message = "Upload failed. Please try again." });
        }
    }
}
```

Note: `FileStorageException` is thrown by `FormImageStorage` for invalid file type/size. It lives in `Marsipan.Membership.Middleware.Services` — add `using Marsipan.Membership.Middleware.Services;` to the using block if not already present via the other usings.

- [ ] **Step 2: Build**

```
dotnet build src/backend/Marsipan.Membership.sln
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Quick integration test**

Start the backend. Run with a valid QR token from Task 2's smoke test:

```bash
curl -X POST "http://localhost:5145/api/public/forms/upload?token=<token>" \
  -F "files=@/path/to/test.jpg"
# Expected: { "formId": N }
```

Without a token:
```bash
curl -X POST "http://localhost:5145/api/public/forms/upload" \
  -F "files=@/path/to/test.jpg"
# Expected: 400 { "message": "Upload token is required." }
```

- [ ] **Step 4: Commit**

```
git add src/backend/Marsipan.Membership.Web/Controllers/PublicFormsController.cs
git commit -m "feat: POST /api/public/forms/upload anonymous endpoint"
```

---

## Task 4: Frontend — Dashboard "Upload from Phone" button + QR modal

**Files:**
- Modify: `src/client/MembershipAdmin/package.json` (via npm install)
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Install qrcode.react**

```
npm --prefix src/client/MembershipAdmin install qrcode.react
```

Expected: package added, no peer-dep errors.

- [ ] **Step 2: Add QR modal state and logic to Dashboard.jsx**

Open `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`.

Add imports at the top:

```jsx
import { QRCodeSVG } from 'qrcode.react'
import api from '../../framework/api'
```

Inside the `Dashboard` component, add state after the existing state declarations:

```jsx
const [qrOpen, setQrOpen] = useState(false)
const [qrToken, setQrToken] = useState(null)
const [qrExpiry, setQrExpiry] = useState(null)
const [qrError, setQrError] = useState(null)
const [qrLoading, setQrLoading] = useState(false)
```

Add handler:

```jsx
const openQr = async () => {
  setQrToken(null)
  setQrError(null)
  setQrExpiry(null)
  setQrLoading(true)
  setQrOpen(true)
  try {
    const res = await api.post('/api/forms/qr-token')
    setQrToken(res.data.token)
    setQrExpiry(res.data.expiresAt)
  } catch {
    setQrError('Could not generate upload link. Please try again.')
  } finally {
    setQrLoading(false)
  }
}
```

- [ ] **Step 3: Add the button to the dashboard JSX**

In the return of `Dashboard`, add the button right below the `<h2>` title (before the stats grid):

```jsx
<div className="mb-6 flex items-center justify-between">
  <h2 className="text-2xl font-semibold text-black dark:text-white">
    {t('title')}
  </h2>
  <button
    type="button"
    onClick={openQr}
    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
  >
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
    </svg>
    Upload from Phone
  </button>
</div>
```

Replace the standalone `<h2>` that already exists with the `<div>` wrapper above (remove the bare `<h2>` and wrap it).

- [ ] **Step 4: Add the QR modal JSX**

At the end of the Dashboard return, just before the closing `</div>`, add:

```jsx
{qrOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="relative w-full max-w-sm rounded-sm border border-stroke bg-white p-8 shadow-default">
      <button
        type="button"
        onClick={() => setQrOpen(false)}
        className="absolute right-4 top-4 text-body hover:text-black"
        aria-label="Close"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <h3 className="mb-4 text-lg font-semibold text-black">Upload from Phone</h3>

      {qrLoading && (
        <div className="flex justify-center py-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {qrError && (
        <p className="text-sm text-danger">{qrError}</p>
      )}

      {qrToken && !qrLoading && (
        <>
          <div className="flex justify-center mb-4">
            <QRCodeSVG
              value={`${window.location.origin}/m/upload?token=${encodeURIComponent(qrToken)}`}
              size={220}
              level="M"
            />
          </div>
          <p className="text-center text-xs text-body">
            Scan with your phone to upload photos.
          </p>
          {qrExpiry && (
            <p className="mt-1 text-center text-xs text-bodydark2">
              Valid until {new Date(qrExpiry).toLocaleTimeString()}
            </p>
          )}
        </>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 5: Build check**

```
npm --prefix src/client/MembershipAdmin run build
```

Expected: clean build.

- [ ] **Step 6: Commit**

```
git add src/client/MembershipAdmin/
git commit -m "feat: Dashboard QR upload button and modal"
```

---

## Task 5: Frontend — MobileUpload page + public route

**Files:**
- Create: `src/client/MembershipAdmin/src/pages/upload/MobileUpload.jsx`
- Modify: `src/client/MembershipAdmin/src/services/router.jsx`

- [ ] **Step 1: Create MobileUpload.jsx**

```jsx
// src/client/MembershipAdmin/src/pages/upload/MobileUpload.jsx
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7226'

export default function MobileUpload() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [files, setFiles] = useState([])
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [errorMsg, setErrorMsg] = useState(null)
  const inputRef = useRef(null)

  if (!token) {
    return (
      <Shell>
        <p className="text-danger text-sm text-center">Invalid upload link.</p>
      </Shell>
    )
  }

  const handleFiles = (e) => {
    setFiles(Array.from(e.target.files || []))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) return

    setStatus('uploading')
    setErrorMsg(null)

    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))

    try {
      const res = await fetch(
        `${API_BASE}/api/public/forms/upload?token=${encodeURIComponent(token)}`,
        { method: 'POST', body: fd }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.message || 'Upload failed. Please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-8">
          <svg className="h-16 w-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-black">Photos uploaded!</p>
          <p className="text-sm text-body text-center">
            You can close this page. Continue on your desktop.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-black mb-6 text-center">Upload Photos</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-sm border-2 border-dashed border-stroke bg-gray-2 p-8 text-body hover:border-primary hover:text-primary"
        >
          <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-medium">
            {files.length > 0
              ? `${files.length} photo${files.length > 1 ? 's' : ''} selected`
              : 'Tap to choose photos'}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFiles}
        />

        {errorMsg && (
          <p className="text-sm text-danger text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={files.length === 0 || status === 'uploading'}
          className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          {status === 'uploading' ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 py-12">
      <div className="w-full max-w-sm rounded-sm border border-stroke bg-white p-6 shadow-default">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add public route to router.jsx**

Open `src/client/MembershipAdmin/src/services/router.jsx`.

Add import at the top with the other page imports:

```jsx
import MobileUpload from '../pages/upload/MobileUpload'
```

Add route before the catch-all `<Route path="*" ...>`:

```jsx
{/* Public mobile upload page — no auth required */}
<Route path="/m/upload" element={<MobileUpload />} />

<Route path="*" element={<Navigate to="/dashboard" replace />} />
```

- [ ] **Step 3: Build check**

```
npm --prefix src/client/MembershipAdmin run build
```

Expected: clean build, no errors.

- [ ] **Step 4: End-to-end verification**

1. Start backend: `dotnet run --project src/backend/Marsipan.Membership.Web --launch-profile https`
2. Start frontend: `npm --prefix src/client/MembershipAdmin run dev`
3. Log in as operator at `http://localhost:5180`
4. Go to Dashboard → click "Upload from Phone"
5. QR modal appears with a QR code
6. On the same machine, open `http://localhost:5180/m/upload?token=<paste token from dev tools>` in a new tab
7. Select an image file → click Upload
8. Success screen appears
9. Go to Forms list → new Pending form with today's date exists, attributed to the operator

- [ ] **Step 5: Commit**

```
git add src/client/MembershipAdmin/src/pages/upload/MobileUpload.jsx
git add src/client/MembershipAdmin/src/services/router.jsx
git commit -m "feat: MobileUpload page and /m/upload public route"
```

---

## Verification

- [ ] `POST /api/forms/qr-token` returns a token for an authenticated operator
- [ ] `POST /api/public/forms/upload?token=<valid>` with an image creates a Pending form in DB
- [ ] `POST /api/public/forms/upload?token=<expired>` returns 400
- [ ] `POST /api/public/forms/upload` (no token) returns 400
- [ ] Dashboard QR modal opens, shows QR code, displays expiry time
- [ ] Mobile page at `/m/upload?token=…` shows file picker, uploads successfully, shows success screen
- [ ] Mobile page at `/m/upload` (no token) shows "Invalid upload link"
- [ ] Form appears in Forms list with correct `CreatedByUserId`, `ScanDate = today`, `Status = Pending`
- [ ] Playwright auth tests still pass: `npx playwright test tests/e2e/tests/auth.spec.ts --project chromium`

## Dev Note

On a local network (phone scanning a QR from the desktop screen), the QR URL will contain `http://localhost:5180` which the phone cannot resolve. For local testing: open the QR in the same browser tab or use the phone's browser pointed at the machine's LAN IP (`http://192.168.x.x:5180`). In production the real domain is used — this is not a concern there.
