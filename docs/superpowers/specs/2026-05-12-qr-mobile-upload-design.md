# QR Mobile Upload — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Problem

Operators often work at a desktop but need to photograph paper forms with their phone. Currently they must log in on the phone as well, which adds friction. A QR code lets the operator bridge their active desktop session to their phone camera — scan, pick photos, upload, done. The form lands in the system and the operator completes the metadata on their desktop.

## Flow

1. Operator is logged in on desktop → clicks **"Upload from Phone"** button on the dashboard.
2. Frontend calls `POST /api/forms/qr-token` → receives a short-lived signed token.
3. A modal shows a QR code encoding `${window.location.origin}/m/upload?token=…`.
4. Operator scans QR with their phone → lands on a minimal mobile page: file picker + Upload button, no login, no nav.
5. Operator selects/takes photos → taps Upload.
6. `POST /api/public/forms/upload?token=…` validates the token, creates a `Pending` form (today's date, no member, images attached, attributed to the operator).
7. Form appears immediately in the operator's desktop panel for metadata completion.

## Token Design

- **Algorithm:** HMAC-SHA256
- **Payload (JSON, base64url-encoded):** `{ userId, exp }` where `exp` is a Unix timestamp matching the operator's JWT expiry
- **Signature:** `HMAC-SHA256(payload, QrUpload:Secret)`
- **Wire format:** `base64url(payload).base64url(signature)` (two-part dot-separated string)
- **Secret:** `QrUpload:Secret` in `appsettings.json` / `appsettings.Development.json` — separate from JWT secret
- **Validation:** check signature first, then check `exp > now`

## Backend

### New endpoint: `POST /api/forms/qr-token`

- **Auth:** `[Authorize(Policy = "ApiPolicy")]` (any authenticated user)
- **Request:** empty body
- **Response:** `{ token: string, expiresAt: string (ISO 8601) }`
- **Logic:** extract `userId` from JWT claims, extract `exp` from JWT, build and sign token, return it
- **Controller:** `FormsController` (new action, same file)

### New endpoint: `POST /api/public/forms/upload?token={token}`

- **Auth:** `[AllowAnonymous]`
- **Controller:** new `PublicFormsController` in `Marsipan.Membership.Web/Controllers/`  (not under `Controllers/Admin/`)
- **Request:** multipart/form-data with `files[]`
- **Validation:**
  1. Token present → parse payload + signature
  2. Signature valid (HMAC-SHA256 with `QrUpload:Secret`)
  3. `exp > DateTime.UtcNow` (not expired)
  4. At least one file present
- **On success:** create `Form` record:
  - `ScanDate = DateOnly.FromDateTime(DateTime.Today)`
  - `MemberId = null`
  - `Status = FormStatus.Pending`
  - `CreatedByUserId = userId` from token payload
  - Save images to `wwwroot/uploads/forms/{formId}/` (reuse existing file storage logic)
- **Response 200:** `{ formId: int }`
- **Response 400:** `{ message: "..." }` for invalid token, expired token, no files
- **Response 401:** not used (endpoint is anonymous; invalid token → 400)

### New service: `QrTokenService`

Lives in `Marsipan.Membership.Middleware/Services/`. Responsible for:
- `GenerateToken(string userId, DateTimeOffset expiresAt) → string`
- `ValidateToken(string token) → (bool valid, string? userId)`

Reads `QrUpload:Secret` via `IOptions<QrUploadOptions>`.

### New options class: `QrUploadOptions`

`Marsipan.Membership.Middleware/Options/QrUploadOptions.cs`
```csharp
public class QrUploadOptions
{
    public string Secret { get; set; } = string.Empty;
}
```

Registered in `Program.cs`: `builder.Services.Configure<QrUploadOptions>(builder.Configuration.GetSection("QrUpload"));`

### appsettings.Development.json addition
```json
"QrUpload": {
  "Secret": "REPLACE_WITH_RANDOM_32_CHAR_SECRET"
}
```

### CORS
The existing CORS policy allows `http://localhost:5180`. Mobile devices on the same network will use the machine's LAN IP (e.g., `http://192.168.x.x:5180`), which is blocked. Add `builder.Services.AddCors` to also allow any local origin, or document that in production the real domain is used and this is not a concern for production builds.

**Decision:** Allow any origin for `POST /api/public/forms/upload` only (the anonymous endpoint). All other endpoints retain the strict `localhost:5180` policy.

## Frontend

### 1. Install `qrcode.react`

```
npm install qrcode.react
```

### 2. Dashboard.jsx — "Upload from Phone" button + modal

Add to the dashboard (below the stats cards, or as a floating action):

```jsx
<button onClick={openQrModal}>Upload from Phone</button>
```

Modal logic:
- On open: call `POST /api/forms/qr-token` → store `token` and `expiresAt` in local state
- Render `<QRCode value={uploadUrl} size={240} />` where `uploadUrl = ${window.location.origin}/m/upload?token=${token}`
- Show expiry time below QR ("Valid until HH:MM")
- Close button

### 3. New page: `src/pages/upload/MobileUpload.jsx`

- **Route:** `/m/upload` — added to `router.jsx` outside `<PrivateRoute>`, no `<DefaultLayout>` wrapper
- **Layout:** centered card on a white background, no sidebar, no header nav
- **States:**
  - `idle` — file picker + Upload button
  - `uploading` — spinner
  - `success` — "✓ Photos uploaded" message
  - `error` — error message (token expired, network error)
- **Token validation:** on mount, check that `?token` query param exists; if missing show "Invalid link" immediately (full server-side validation happens on submit)
- **File input:** `accept="image/*"` with `capture="environment"` hint for mobile camera, `multiple`
- **On submit:** `POST /api/public/forms/upload?token=${token}` (multipart), handle 200/400 responses
- **No i18n required** for MVP — mobile page is Serbian-only (or English-only); add i18n later if needed

### 4. router.jsx — add public route

```jsx
{ path: '/m/upload', element: <MobileUpload /> }
```

Outside the authenticated route group.

## Files Changed

| File | Change |
|------|--------|
| `Middleware/Options/QrUploadOptions.cs` | NEW |
| `Middleware/Services/QrTokenService.cs` | NEW |
| `Web/Controllers/PublicFormsController.cs` | NEW |
| `Web/Controllers/Admin/FormsController.cs` | Add `GenerateQrToken` action |
| `Web/Program.cs` | Register QrUploadOptions, QrTokenService, update CORS |
| `appsettings.Development.json` | Add `QrUpload.Secret` |
| `client/package.json` | Add `qrcode.react` |
| `client/src/pages/dashboard/Dashboard.jsx` | Add button + QR modal |
| `client/src/pages/upload/MobileUpload.jsx` | NEW |
| `client/src/framework/router.jsx` | Add `/m/upload` public route |

## Out of Scope

- Member pre-selection on mobile (operator completes metadata on desktop)
- Scan date input on mobile (server sets today)
- i18n for the mobile upload page (deferred)
- QR revocation / single-use enforcement (token expiry is sufficient for internal use)
- Push notification to desktop when upload completes (deferred)
