# Call Center Import — prepared data from docs/done/

Generated 2026-07-21 from the 7 municipality spreadsheets in `docs/done/` (previous manual phone campaign).

## Files

| File | Rows | Source |
|---|---|---|
| callcenter-import-novi-beograd.csv | 1,604 | NBGD za pozivanje.xlsx |
| callcenter-import-cukarica.csv | 1,791 | OO Čukarica 14.3.2025.xlsx |
| callcenter-import-palilula.csv | 2,433 | Palilula_Spisak.xlsx |
| callcenter-import-savski-venac.csv | 931 | Savski venac spisak.xlsx |
| callcenter-import-stari-grad.csv | 1,042 | Stari grad POZIVANO.xlsx |
| callcenter-import-vozdovac.csv | 59 | Voždovac.xlsx |
| callcenter-import-zemun.csv | 850 | Zemun.xlsx |
| jmbg-only-reference.csv | 970 | Palilula "не" rows that contained only a JMBG (no name/phone) — not importable as call contacts, kept for member matching |

**Total importable contacts: 8,710**

## Columns

Spec columns (`CallContactImportService`): `FirstName, LastName, Phone, Email, Address, City, Municipality`

Extended columns (require extending the import service — see below): `Phone2, Jmbg, PreviousOutcome, Comment, MemberSince`

`PreviousOutcome` values and counts:

| Value | Count | Meaning |
|---|---|---|
| NIJE_DOBAR_BROJ | 3,137 | number invalid/out of service in the last campaign |
| NE | 2,459 | refused / negative reaction / "iščlaniti" |
| NIJE_DOBIJENO | 1,223 | never answered |
| DA | 1,201 | positive — stays a member / will sign / comes in |
| POZVATI_PONOVO | 482 | asked to be called again |
| NEPOZVANO | 198 | on the Savski venac master list but never dispositioned |
| SIMPATIZER | 10 | supporter, not a member |

## Normalization rules applied

- **Names**: "Prezime (RoditeljIme) Ime" split into LastName/FirstName; parent name dropped; ALL-CAPS names title-cased. Where only "Prezime Ime" was present, the first token was taken as LastName (dominant convention in these files).
- **Phones**: all numbers per row collected, split on `|`, `;`, `,`. `Phone` = first mobile (06x) if any, else first landline; the rest go to `Phone2` (max 2, `;`-separated). `+381` → `0`; int-stored mobiles that lost the leading zero restored; 6–7-digit local numbers prefixed with `011`. Unusable values (`-`, empty) dropped — 680 rows have an empty `Phone` (mostly the "bad number" sheets, where numbers were scrubbed in the source).
- **Emails**: taken from the email column where present (Čukarica), otherwise extracted from comment text.
- **Dedupe** (within municipality): by JMBG, else by name+phone; rows with neither are never merged. The winning row keeps the most "positive" outcome (DA > SIMPATIZER > POZVATI_PONOVO > NIJE_DOBIJENO > NEPOZVANO > NE > NIJE_DOBAR_BROJ) and merges comments/fields.
- **Čukarica**: mesna zajednica appended to Comment as `MZ <name>`. **Stari grad**: `IŠČL`/`NEZAINT` flags appended to Comment.
- Encoding: UTF-8 with BOM (opens correctly in Excel).

## Required changes to CallContactImportService (design spec §4)

The 2026-07-10 design defines import columns as FirstName, LastName, Phone, Email, Address, City, Municipality. To accept these files, extend:

1. **`CallContact` entity** — the fields already exist for most of this:
   - `PreviousOutcome` → could map onto `LastOutcome`/`FinalStatus` at import time (see mapping below), or add a new nullable `ImportedOutcome` string/enum column to keep "previous campaign" separate from this campaign's attempts.
   - `Comment` → add nullable `ImportNote` (or reuse `SuggestionNote` — not recommended, it has script semantics).
   - `Phone2` → add nullable `SecondaryPhone`, or fold into `ImportNote`.
   - `Jmbg` → add nullable `Jmbg` — **valuable**: enables exact member matching in `SuggestMemberMatches` (JMBG is unique on `Member`), much stronger than phone matching.
   - `MemberSince` → informational; suggest folding into `ImportNote`.
2. **CsvHelper class map** — register the extra optional headers; missing headers must remain valid so plain 7-column files still import.
3. **Import validation** — currently "Phone required" is implied; decide whether to allow empty-Phone rows (680 here). Recommendation: import them but exclude from `GetNextForOperator` (`WHERE Phone <> ''`), so the negative/positive history is queryable.

### Suggested PreviousOutcome → enum mapping (if pre-seeding outcomes)

| PreviousOutcome | CallOutcome | ContactFinalStatus |
|---|---|---|
| DA | ValidContact | ActiveMember |
| SIMPATIZER | ValidContact | Sympathizer |
| NE | Refused | NoCooperation |
| NIJE_DOBAR_BROJ | WrongNumber | — |
| NIJE_DOBIJENO / POZVATI_PONOVO / NEPOZVANO | NoAnswer / — | — |

Alternative (simpler): don't pre-seed `LastOutcome` at all — keep `PreviousOutcome` as a plain imported string column used only for pool filtering (e.g. build a pool of `POZVATI_PONOVO + NIJE_DOBIJENO + NEPOZVANO` for re-calling), and let the new campaign record fresh outcomes cleanly.
