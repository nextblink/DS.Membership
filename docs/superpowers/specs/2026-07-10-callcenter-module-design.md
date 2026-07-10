# Call Center Module — Design Spec

**Date:** 2026-07-10
**Status:** Approved (design), pending implementation plan
**Source spec:** `docs/callcenter.docx` — *Функционална спецификација – База за кол центар и ажурирање чланства*

## 1. Purpose

A module attached to the Membership app for running a **phone campaign** to update the party's contact base. Operators call **imported leads** (people not yet in the system), work through a **guided, conditional 7-step script** (~4 minutes/call), and record the outcome. On confirmation a lead can be **enrolled as a new `Member`** (via the existing Add-Member form) or **linked to an existing `Member`**.

Core principle from the source spec: the operator does **not** fill a flat form — the system **drives the conversation** through logical steps, where each answer determines whether the call continues or ends.

## 2. Decisions (brainstorming outcomes)

| # | Decision |
|---|---|
| Call list source | **Imported leads only.** Contacts are their own entity, not tied to `Member`. |
| Conversion to member | **Hand-off to the existing Add-Member form**, pre-filled from collected data; resulting `MemberId` stored back on the contact. No half-valid members, no schema relaxation. |
| Matching existing member | **Both** — phone-number auto-suggest **and** manual search-link. |
| Lead entry | **CSV/Excel import** (no manual single-lead add in v1). |
| Grouping | **Campaigns** — leads belong to a named calling action. |
| Permissions | Admin/SuperAdmin: campaigns, import, pools, reports. Operator: call queue, script, outcome, linking. |
| Assignment | **Persistent `CallPool`** built from a search query (place/opština/etc.), assigned to **many operators** who share the queue. |
| Pool membership | **Snapshot** on create/refresh — stamps `PoolId` on matching contacts; a contact is in **≤ 1 pool**. |

## 3. Data model

New entities live in `src/backend/Marsipan.Membership.Middleware/Entities/`, all extend `BaseEntity` (soft-delete + EF query filter).

### Entities

**`Campaign`**
- `Name` (required), `Description?`, `StartDate`, `IsActive`
- Navigation: `ICollection<CallContact>`, `ICollection<CallPool>`

**`CallContact`** — the imported lead plus everything collected on the call.
- *Imported / basic:* `FirstName`, `LastName`, `PhoneNumber`, `Email?`, `Address?`, `City?`, `MunicipalityId?`, `CampaignId`
- *Assignment:* `PoolId?` (≤ 1 pool), `ClaimedByUserId?`, `ClaimedAt?`, `AttemptCount`, `LastCalledAt?`
- *Linking / conversion:* `MatchedMemberId?` (link to existing member), `ConvertedMemberId?` (set after Add-Member hand-off)
- *Call outcome (nullable until called):* `LastOutcome` (CallOutcome?), `PartyRelation` (PartyRelation?), `ActivityLevel` (ActivityLevel?), `WantsToBeActive` (bool?), `SuggestionNote?`, `KnowsPotentialMembers` (bool?), `WillingToEnroll` (bool?), `FinalStatus` (ContactFinalStatus?, **indexed**)
- Navigation: `ICollection<CallAttempt>`, `ICollection<ContactEngagementArea>`

**`CallAttempt`** — one row per dial.
- `CallContactId`, `Outcome` (CallOutcome), `CalledByUserId`, `CalledAt`, `Note?`

**`ContactEngagementArea`** — join table for the multi-select Корак 4.
- `CallContactId`, `EngagementArea` (EngagementArea)

**`CallPool`**
- `Name`, `CampaignId`, `IsActive`
- Stored filter criteria: `FilterCity?`, `FilterMunicipalityId?`, `FilterOutcome?`, `FilterJson?` (extensibility)
- Navigation: `ICollection<CallPoolOperator>`, `ICollection<CallContact>`

**`CallPoolOperator`** — join table (many operators per pool).
- `CallPoolId`, `UserId` (`ApplicationUser`)

### Enums (`Middleware/Enums/Enums.cs`)

- `CallOutcome`: `ValidContact, WrongNumber, NotInService, NoAnswer, Refused`
- `PartyRelation`: `StayMember, Sympathizer, NoCooperation`
- `ActivityLevel`: `Active, Occasional, Inactive`
- `EngagementArea`: `MunicipalBoard, DepartmentalBoards, CentralOffice, OrganizationalExecutive, ElectionCampaign, ElectionMonitor`
- `ContactFinalStatus`: `ActiveMember, InactiveMember, Sympathizer, NoCooperation`

### Key rules

- **Snapshot pool membership:** create/refresh stamps `PoolId` on matching contacts; contact ∈ ≤ 1 pool → no two operators race the same lead.
- **Get-next:** returns the oldest uncalled, unclaimed contact in the operator's pool(s), sets a soft-claim (`ClaimedByUserId`/`ClaimedAt`).
- **`FinalStatus`** is computed from the script answers on call completion; indexed; drives all reports.
- **Scope filtering:** `Operator` sees only contacts in pools they are assigned to; `Admin`/`SuperAdmin` see all. Extends the existing `ScopeFilters` pattern.
- EF migration required for all new tables (no manual SQL).

## 4. Services (`Middleware/Services/`)

- **`CampaignService`** — CRUD, paged list, activate/deactivate.
- **`CallContactImportService`** — parse CSV (**CsvHelper**) / xlsx (**ClosedXML**), validate rows, bulk-insert into a campaign, return `{ imported, skipped, errors[] }`. Columns: FirstName, LastName, Phone, Email, Address, City, Municipality.
- **`CallContactService`** — filtered paged list; `GetNextForOperator(userId)` (claim); `SaveCallOutcome(dto)` (attempt + answers + engagement areas + `FinalStatus` + in-place contact-data update + clear claim); `SuggestMemberMatches(contactId)` (members sharing phone); `LinkToMember`/`Unlink`; `PrepareEnrollment(contactId)` (Add-Member pre-fill payload); set `ConvertedMemberId` post-save.
- **`CallPoolService`** — create (snapshot-stamp), `Refresh` (re-stamp new matches), assign/unassign operators, list with counts, release contacts.
- **`CallCenterReportService`** — the 13 aggregate metrics, filterable by campaign/pool/date.

## 5. API (`Web/Controllers/Admin/`, `[Authorize]`, standard pagination envelope)

| Controller | Endpoints |
|---|---|
| `CampaignsController` | `GET/POST/PUT/DELETE /api/admin/campaigns`, `GET /{id}` |
| `CallContactsController` | `GET /api/admin/call-contacts` (filter+page), `GET /{id}`, `POST /import` (multipart, Admin), `GET /next` (operator), `POST /{id}/outcome`, `GET /{id}/match-suggestions`, `POST /{id}/link/{memberId}`, `DELETE /{id}/link`, `GET /{id}/enrollment-prefill`, `POST /{id}/converted/{memberId}` |
| `CallPoolsController` | `GET/POST/PUT/DELETE /api/admin/call-pools`, `POST /{id}/refresh`, `POST /{id}/operators`, `DELETE /{id}/operators/{userId}` |
| `CallCenterReportsController` | `GET /api/admin/call-center/reports` (filters → aggregates) |

**Auth split:** import / campaign & pool management / reports → `Admin`+`SuperAdmin`; call queue + outcome + link → `Operator` (+ admins).

## 6. Frontend (`src/client/MembershipAdmin/src/pages/callcenter/`)

New "Кол центар" sidebar group.

**Admin pages**
- **Campaigns** — `CampaignList.jsx`, `CampaignForm.jsx`
- **Import** — `ContactImport.jsx` (pick campaign, upload CSV/xlsx, column-mapping preview, import summary)
- **Contacts** — `ContactList.jsx` (filter by campaign/pool/city/opština/status/outcome, paged)
- **Pools** — `PoolList.jsx`, `PoolForm.jsx` (build from filter criteria with live count preview, assign operators, Refresh)

**Operator pages**
- **Call queue** — `CallQueue.jsx` ("Позови следећи" → claim + open wizard, remaining count)
- **Call wizard** — `CallScript.jsx` — 7 conditional steps per spec:
  1. Contact outcome — non-valid ⇒ save attempt + end
  2. Party relation — no-cooperation ⇒ end
  3. Activity level (+ "желите да будете активни?" if inactive)
  4. Engagement areas (multi-select, only if interested)
  5. Update contact data (phone/email/address in place)
  6. Suggestion note (conditional text)
  7. Recommendations (knows potential members? willing to enroll?)
  - On finish: `POST /outcome`, set `FinalStatus`, return to queue.
  - **Member linking:** banner with phone-match suggestions + manual search; **"Учлани"** → navigate to Add-Member form pre-filled from `enrollment-prefill`, post back `ConvertedMemberId` on save.

**Reports page** — `CallCenterReports.jsx` — filter bar (campaign/pool/date) + 13 metric cards/table + CSV export.

**Wiring:** routes in `framework/router.jsx` (admin vs operator guards), API wrappers in `framework/api.js`, sidebar entries in `components/Sidebar.jsx`. Conditional-step logic in `services/callScript.js` so the wizard stays thin.

**UX principle (from spec):** minimal manual entry, options over free text, conditional rendering, one action per step, fast (4-min) calls.

## 7. Reports — the 13 metrics

Contacted (successful), invalid contacts, active members, inactive members, sympathizers, no-cooperation, interested-in-activating, and per-engagement-area counts (municipal board, departmental boards, central office, election campaigns, election monitors), plus most-frequent suggestions.

## 8. Out of scope (v1 / YAGNI)

- Manual single-lead entry (import only).
- Auto-creating leads from recommendations (Корак 7 stored as flags/note only).
- Purely dynamic pool membership.
- Blob/S3 storage, external telephony/dialer integration.

## 9. Alignment notes

- Follows the NextBlink Middleware + Web split and the Services + DTOs (no Repository) layering already used in this repo.
- Reuses `Member`, `Committee`/`Municipality`, `ApplicationUser`, existing scope-filter and pagination-envelope patterns.
- EF migrations only; conventional commits; `issue/<n>-<slug>` branches.
