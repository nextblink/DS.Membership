# Targeted Communication Platform — Design Spec

**Date:** 2026-05-18  
**Branch:** feature/marcipano-telegram  
**Status:** Approved

---

## Overview

Extend the Marcipano Telegram Mini App with member-driven, role-aware announcement broadcasting and ad-hoc event groups. The system builds directly on the existing announcement + bot notification infrastructure.

Two capabilities are added:

1. **Committee broadcasts** — trustees and function-holders can send announcements scoped to their own committee; all other members see the compose button hidden.
2. **Event groups** — ad-hoc opt-in groups for things like protests or assemblies; eligible members create them, anyone in the committee can RSVP; announcements can target an event's subscriber list.

---

## Data Model

### New entity: `Event` (extends `BaseEntity`)

| Column | Type | Notes |
|---|---|---|
| `Id` | int PK | |
| `Name` | nvarchar(200) | required |
| `Description` | nvarchar(2000) | nullable |
| `CommitteeId` | int FK → Committees | scopes management and sending |
| `CreatedByMemberId` | int FK → Members | set server-side from JWT |
| `IsActive` | bit | false = no new RSVPs accepted |
| `StartDate` | datetime2 | nullable, display only |

Global query filter: `!IsDeleted`.

### New entity: `EventMembership` (extends `BaseEntity`)

| Column | Type | Notes |
|---|---|---|
| `Id` | int PK | |
| `EventId` | int FK → Events | |
| `MemberId` | int FK → Members | |
| `JoinedAt` | datetime2 | |
| `AddedByMemberId` | int FK → Members | nullable — null = self-signup |

Unique index on `(EventId, MemberId)`.

### Modified entity: `Announcement`

Add one nullable column:

| Column | Type | Notes |
|---|---|---|
| `TargetEventId` | int FK → Events | nullable; mutually exclusive with `TargetCommitteeId`/`TargetLevel`/`TargetFunctionId` |

---

## Permission Logic

### Who can send (committee broadcast or event announcement)

A member passes the **send gate** if either condition is true:
- `Committee.TrusteeId == member.Id` (member is trustee of their committee), OR
- A row exists in `MemberFunctions` for `(memberId, member.CommitteeId)` (member holds any function in their committee)

### Who can create an event

Same send-gate check. Only members who pass the gate can `POST /api/events`.

### Who can send to an event

Member must pass the send gate AND one of:
- `Event.CreatedByMemberId == member.Id`, OR
- `Event.CommitteeId == member.CommitteeId` (event belongs to sender's committee)

### Scope enforcement

- **Committee announcements**: `TargetCommitteeId` is force-set server-side from the sender's JWT claim `committeeId`. The client does not send this field.
- **Event announcements**: API validates that `Event.CommitteeId == sender.CommitteeId`; rejects with 403 otherwise.

### Service method

```csharp
Task<bool> CanSendAsync(int memberId, CancellationToken ct);
```

Added to `IAnnouncementService`. Returns true if the member passes the send gate.

---

## API Endpoints

### Announcements controller (additions)

| Method | Route | Description |
|---|---|---|
| GET | `/api/announcements/can-send` | Returns `{ canSend: bool }` |

### Events controller (new)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/events` | member | List active events for member's committee |
| GET | `/api/events/{id}` | member | Event detail + caller's membership status |
| POST | `/api/events` | send-gate | Create event |
| DELETE | `/api/events/{id}` | creator or send-gate | Soft-delete event |
| POST | `/api/events/{id}/join` | member | Self-RSVP |
| DELETE | `/api/events/{id}/join` | member | Leave event |
| POST | `/api/events/{id}/members` | send-gate | Organizer adds member `{ memberId }` |
| DELETE | `/api/events/{id}/members/{memberId}` | send-gate | Organizer removes member |

### Sync payload additions

`GET /api/sync` response extended to include:
- `events` — active events for member's committee
- `myEventIds` — IDs of events the caller has joined

### Bot notifier

`TelegramBotService.NotifyAsync` gains an additional branch:

```
if TargetEventId is set:
  load EventMembership rows for that event
  resolve TelegramLinks for those members
  send bot message to each
```

---

## Mini App UI

### Navigation

Bottom tab bar added with two tabs: **Feed** | **Events**

### EventsPage

- List of active events for the member's committee
- Each row: name, member count, joined badge
- Eligible members (send-gate pass) see **+ New Event** button

### EventDetailPage (`/events/:id`)

- Event name, description, date
- **Join / Leave** button for all members
- Organizers additionally see: member list with remove buttons, "Add member" input (search by name)

### ComposePage changes

- On mount: call `GET /api/announcements/can-send`; if false, do not render (the `+ New` button in the header is also hidden)
- **Target** selector: `My Committee` (default) | `Event`
- When `Event` selected: show dropdown of events in the member's committee; committee-level fields hidden
- `TargetCommitteeId` removed from client payload — server sets it

### Feed

No changes. Event announcements appear in the feed identically to committee announcements.

---

## Error Handling

| Scenario | Response |
|---|---|
| Member calls `POST /api/announcements` without send permission | 403 |
| Member targets event in another committee | 403 |
| Member joins an inactive event (`IsActive = false`) | 400 `event_inactive` |
| Duplicate RSVP | 409 (unique constraint) handled as 200 (idempotent) |
| Organizer removes non-member | 404 |

---

## Migrations

Two new EF migrations:
1. `AddEvents` — creates `Events` and `EventMemberships` tables
2. `AddAnnouncementTargetEvent` — adds `TargetEventId` FK to `Announcements`
