# AI Form Scanning Design

**Date:** 2026-05-17  
**Status:** Approved

## Context

The party collects new member registrations on a physical paper form called "Евиденциони образац" (Registration Form). Operators currently photograph these forms and upload them manually, then re-type all the data into the system by hand. This is slow and error-prone.

The redesigned flow uses Claude's vision API to read the handwritten form, extract all member fields, and pre-fill the member creation form for operator review. The original image is kept as an audit trail (Form record) linked to the new member.

---

## User Flow

### Step 1 — `/forms/new` (Image Upload)

- Operator opens the upload page and attaches one or more photos of the paper form (drag/drop or camera on mobile)
- Clicks **"Extract from image"** (replaces the old Submit button)
- Frontend POSTs the **first image only** to `POST /api/forms/extract` (the form is a single page; additional images are alternate shots stored as-is)
- A loading spinner shows: *"Claude is reading the form…"* (2–5 sec)
- On success: navigate to `/members/new` passing extracted data + image files as React Router `state`
- On failure: show error with retry option; operator can also skip extraction and go to manual entry

### Step 2 — `/members/new` (Review & Correct)

- Member creation form opens pre-filled with extracted data
- Fields populated by Claude have a subtle visual marker (blue left border)
- Null fields (Claude couldn't read them) appear empty — operator fills manually
- **JMBG duplicate check**: fires immediately on mount (if JMBG was extracted) and on blur whenever the JMBG field changes
  - Calls `GET /api/members?jmbg={value}&pageSize=1`
  - If match found: yellow warning banner — *"A member with this JMBG already exists — [Full Name]. View their record?"* (link to existing member)
  - Warning clears when JMBG changes to a non-duplicate
  - Operator can dismiss and submit anyway; 409 is the hard backend block
- Operator reviews, corrects any mistakes, fills in blanks
- Clicks **Save**

### Step 3 — Save & Audit Trail

- `POST /api/members` — creates the member
- On success: frontend silently calls `POST /api/forms` with the uploaded images + new `memberId`
- Redirects to the new member's detail page (`/members/{id}`)
- The Form record exists in the background, preserving the original scan as evidence

---

## Backend

### New Service: `IFormExtractionService` / `FormExtractionService`

**File:** `src/backend/Marsipan.Membership.Middleware/Services/FormExtractionService.cs`

```csharp
public interface IFormExtractionService
{
    Task<ExtractedFormDataDto> ExtractAsync(IFormFile image, CancellationToken ct = default);
}
```

- Encodes image as base64, sends to Claude API via Anthropic SDK
- Model: **claude-3-5-haiku-20241022** (fast, low cost, strong at structured extraction from handwritten Serbian forms)
- Uses a structured JSON extraction prompt listing every field by its Serbian label
- All returned fields are nullable — unreadable fields come back as null
- Throws `InvalidOperationException` if the image cannot be processed at all

### Extraction Prompt (key elements)

The prompt instructs Claude to:
1. Read the "Евиденциони образац" form
2. Extract every field by its label (Serbian label → JSON key mapping provided)
3. Return a single JSON object with camelCase keys matching `ExtractedFormDataDto`
4. Use null for any field that is blank or illegible
5. For Gender: return "Male" or "Female" (not "M"/"Ž")
6. For dates: return ISO format `YYYY-MM-DD`
7. For phones: return as array with type (Mobile/Landline/Business)
8. For MaritalStatus: map Serbian values to enum names (Oženjen/Udata → Married, etc.)
9. For EducationLevel: map Srednja → Secondary, Fakultet → University, etc.

### New DTO: `ExtractedFormDataDto`

**File:** `src/backend/Marsipan.Membership.Middleware/DTOs/FormDTOs.cs`

```csharp
public class ExtractedFormDataDto
{
    // Member fields
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ParentName { get; set; }
    public string? DateOfBirth { get; set; }   // ISO date string
    public string? Jmbg { get; set; }
    public string? Gender { get; set; }         // "Male" | "Female"
    public string? PostalCode { get; set; }
    public string? IdCardNumber { get; set; }
    public string? City { get; set; }
    public string? Email { get; set; }
    public List<ExtractedPhoneDto> Phones { get; set; } = new();
    public string? MaritalStatus { get; set; }  // enum name
    public string? VotingPlace { get; set; }
    public int? VotingPlaceNumber { get; set; }
    public string? EducationLevel { get; set; } // enum name
    public string? Occupation { get; set; }
    public string? JobTitle { get; set; }
    public string? CompanyName { get; set; }
    public string? CompanyCity { get; set; }
    public bool? IsPublicCompany { get; set; }

    // Form metadata (for the Form record)
    public string? FormNumber { get; set; }
    public string? FormDate { get; set; }       // ISO date string
    public string? OrgUnitName { get; set; }    // from the stamp/header

    // Party function listed on the form (e.g. "Član OO")
    public string? Function { get; set; }
}

public class ExtractedPhoneDto
{
    public string Number { get; set; } = string.Empty;
    public string Type { get; set; } = "Mobile";  // "Mobile" | "Landline" | "Business"
}
```

### New Endpoint: `POST /api/forms/extract`

**File:** `src/backend/Marsipan.Membership.Web/Controllers/Admin/FormsController.cs`

- Accepts: `multipart/form-data` with a single `file` field
- Returns: `200 OK` with `ExtractedFormDataDto`
- Returns: `400 Bad Request` if no file or unsupported type
- Returns: `422 Unprocessable Entity` if Claude cannot extract any data
- Auth: same `ApiPolicy` as other form endpoints (requires JWT)
- Does **not** persist anything — extraction is stateless

### Configuration

**File:** `src/backend/Marsipan.Membership.Web/appsettings.json`

```json
"Anthropic": {
  "ApiKey": "REPLACE_WITH_KEY",
  "Model": "claude-3-5-haiku-20241022"
}
```

Add `AnthropicOptions` strongly-typed options class. Register `FormExtractionService` in DI.

**NuGet:** `Anthropic.SDK` package added to `Marsipan.Membership.Web.csproj`.

---

## Frontend

### Modified: `FormUpload.jsx` (`/forms/new`)

- Remove old metadata inputs (formNumber, formDate, municipalBoard) from Step 1 — these come from extraction
- Keep image upload area (drag/drop, camera, file picker)
- Replace "Submit" with "Extract from image" primary button (disabled until ≥1 image selected)
- Add "Enter manually" secondary link → navigates to `/members/new` without state (plain form)
- Loading state: spinner overlay with "Claude is reading the form…"
- On extraction success: `navigate('/members/new', { state: { extracted, files } })`
- On failure: inline error + retry button

### Modified: `MemberForm.jsx` / `MemberCreate.jsx`

- Read `location.state?.extracted` and `location.state?.files` on mount
- If present: pre-fill all matching fields from `extracted`
- Pre-filled fields: add CSS class `extracted-field` → blue left border (2px solid brand-500) to signal AI-filled
- Border disappears once the user edits the field
- **JMBG duplicate check:**
  - On mount (if `extracted.jmbg` present): debounced 300ms → `GET /api/members?jmbg=...&pageSize=1`
  - On blur of JMBG input
  - Shows yellow warning banner with link to existing member if found
  - Clears on JMBG change
- After `POST /api/members` succeeds:
  - If `location.state?.files` present: `POST /api/forms` with files + new memberId + extracted formNumber/formDate/orgUnitName
  - Redirect to `/members/{newId}` regardless of Form creation success (Form failure is logged, not blocking)

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Extraction API key missing/invalid | 500 with clear message in dev; generic error in prod |
| Image too dark / illegible | Claude returns partial data (nulls for unreadable fields); form shows empty fields |
| Claude returns malformed JSON | Service catches parse error → 422 |
| Network timeout during extraction | Frontend shows timeout error + retry |
| Member save 409 (duplicate JMBG) | Hard block; pre-save warning should have caught it |
| Form record creation fails after member saved | Non-blocking; member still created; log error server-side |

---

## Files to Create / Modify

| File | Change |
|---|---|
| `Middleware/Services/IFormExtractionService.cs` | New interface |
| `Middleware/Services/FormExtractionService.cs` | New implementation (Anthropic SDK) |
| `Middleware/Options/AnthropicOptions.cs` | New strongly-typed config |
| `Middleware/DTOs/FormDTOs.cs` | Add `ExtractedFormDataDto`, `ExtractedPhoneDto` |
| `Web/Controllers/Admin/FormsController.cs` | Add `POST /api/forms/extract` endpoint |
| `Web/Program.cs` | Register service + options |
| `Middleware/Marsipan.Membership.Middleware.csproj` | Add `Anthropic.SDK` NuGet |
| `client/pages/forms/FormUpload.jsx` | Redesign to extraction flow |
| `client/pages/members/MemberCreate.jsx` | Pass state through to MemberForm |
| `client/pages/members/MemberForm.jsx` | Pre-fill from state, JMBG check, post-save Form creation |
| `client/src/locales/sr/forms.json` | New translation keys |
| `client/src/locales/en/forms.json` | New translation keys |
