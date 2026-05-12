# TailAdmin Polish — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Problem

The admin panel uses TailAdmin colors and card wrappers but three areas break the visual contract:

1. **Sidebar** — nav items use a 7 px bullet dot instead of SVG icons, making the sidebar look unfinished.
2. **Dashboard stat cards** — every card renders the same people/users icon regardless of what the stat represents; there are no per-stat accent colors.
3. **List pages** — the filter panel and table are two separate bordered cards floating inside a padded `p-6` wrapper instead of a single unified TailAdmin card; the table uses standard Tailwind `bg-gray-50` / `shadow-sm` instead of TailAdmin's `bg-gray-2` / `shadow-default`.

## Changes

### 1. Sidebar — SVG icons per nav item

**File:** `src/client/MembershipAdmin/src/config.js`  
Add an `icon` field (a render function or component) to each entry in `NAV_ITEMS`.

**File:** `src/client/MembershipAdmin/src/components/Sidebar.jsx`  
Render `item.icon` instead of the dot span. Group nav items under two section headings: **Main Menu** (Dashboard → Users) and **Account** (Profile).

Icons to use (Heroicons outline, 24 px):

| Nav item   | Icon path (stroke-width 2)                                                    |
|------------|-------------------------------------------------------------------------------|
| Dashboard  | Home / house                                                                  |
| Members    | Users group                                                                   |
| Forms      | Document text                                                                 |
| Org Units  | Office building                                                                |
| Functions  | Clipboard list                                                                 |
| Users      | User group (add)                                                              |
| Profile    | User circle                                                                   |

Active state stays `bg-graydark text-white`; icon opacity bumps to 1 on active, 0.75 otherwise.

### 2. StatsCard — unique icon + accent color per stat

**File:** `src/client/MembershipAdmin/src/pages/dashboard/StatsCard.jsx`  
Add two optional props: `icon` (JSX) and `iconColor` (Tailwind bg class, e.g. `bg-primary/10`). Default to current blue people icon when not provided.

**File:** `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`  
Pass distinct icons and colors to each `<StatsCard>`:

| Stat           | Icon              | Accent              |
|----------------|-------------------|---------------------|
| Total Members  | Users group       | `bg-primary/10` (blue)   |
| Verified Forms | Check circle      | `bg-success/10` (green)  |
| Pending Forms  | Clock             | `bg-warning/10` (yellow) |
| Org Units      | Office building   | `bg-danger/10` (red)     |

### 3. List pages — single unified card

Affected pages (same pattern applies to all):
- `src/client/MembershipAdmin/src/pages/members/MembersList.jsx`
- `src/client/MembershipAdmin/src/pages/forms/FormsList.jsx`
- `src/client/MembershipAdmin/src/pages/org-units/OrgUnitsList.jsx`
- `src/client/MembershipAdmin/src/pages/functions/FunctionsList.jsx`
- `src/client/MembershipAdmin/src/pages/users/UsersList.jsx`

**Structure change** (all in one card, no outer `p-6` wrapper):

```
<div class="rounded-sm border border-stroke bg-white shadow-default">
  <!-- Card header: title left, Add button right -->
  <div class="px-5 pt-6 pb-4 flex items-center justify-between border-b border-stroke">
    <h1>Page Title</h1>
    <button class="inline-flex items-center gap-2 rounded-md bg-primary ...">
      <PlusIcon /> Add Item
    </button>
  </div>

  <!-- Filter bar (only on pages that have filters) -->
  <div class="bg-gray-2 px-5 py-4 border-b border-stroke">
    <!-- filter inputs -->
  </div>

  <!-- Table -->
  <div class="overflow-x-auto">
    <table>
      <thead class="bg-gray-2">...</thead>
      <tbody>...</tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="px-5 py-4 border-t border-stroke flex items-center justify-between">
    ...
  </div>
</div>
```

**Token substitutions:**
- `shadow-sm` → `shadow-default`
- `bg-gray-50` → `bg-gray-2`
- `rounded border` → `rounded-sm border border-stroke`
- Page-level `p-6` wrapper div → removed; card sits directly in the layout

## Out of scope

- Header / top bar (user selected it was fine)
- Dark mode behavior (existing `dark:` classes are preserved, not changed)
- Any backend changes
- Forms detail / create / edit pages (layout unchanged; only list pages get the unified card)
- New Tailwind config entries — `shadow-default`, `bg-gray-2` etc. already exist in `tailwind.config.js` extended colors; they just weren't being used consistently

## Files touched

| File | Change |
|------|--------|
| `src/.../config.js` | Add `icon` to each NAV_ITEMS entry |
| `src/.../Sidebar.jsx` | Render icon, add section groupings |
| `src/.../StatsCard.jsx` | Accept `icon` + `iconColor` props |
| `src/.../Dashboard.jsx` | Pass distinct icon/color per StatsCard |
| `src/.../MembersList.jsx` | Unified card structure |
| `src/.../FormsList.jsx` | Unified card structure |
| `src/.../OrgUnitsList.jsx` | Unified card structure |
| `src/.../FunctionsList.jsx` | Unified card structure |
| `src/.../UsersList.jsx` | Unified card structure |
