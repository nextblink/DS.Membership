# TailAdmin v4 Migration Design

**Date:** 2026-05-12  
**Scope:** Full migration of `src/client/MembershipAdmin` from Tailwind CSS v3 to v4, adopting the TailAdmin v4 visual design (collapsible sidebar, dark mode, brand color palette, Outfit font) across all pages.  
**Reference:** `docs/free-react-tailwind-admin-dashboard-main/` (TailAdmin v4, TypeScript/React)

---

## 1. Tailwind v4 Upgrade

### Package changes

| Remove | Add |
|---|---|
| `tailwindcss@3` | `tailwindcss@4` |
| `autoprefixer` | `@tailwindcss/vite` |
| _(postcss config)_ | `clsx`, `tailwind-merge` |

`autoprefixer` and PostCSS config are no longer needed — Tailwind v4 ships a native Vite plugin.

### Config changes

- **Delete** `tailwind.config.js` — v4 has no JS config file; all theme tokens live in CSS.
- **Delete** `postcss.config.js`.
- **Update** `vite.config.js`: replace the PostCSS/Tailwind plugin with `@tailwindcss/vite`.
- **Replace** `src/index.css` with the TailAdmin v4 CSS, which contains:
  - `@import "tailwindcss"` (v4 import style)
  - `@custom-variant dark (&:is(.dark *))` for class-based dark mode
  - `@theme { ... }` block defining: Outfit font, custom breakpoints, brand/gray/success/error/warning/orange color scales, shadow tokens, z-index tokens
  - `@utility` definitions for sidebar menu item patterns (`menu-item`, `menu-item-active`, `menu-item-inactive`, etc.)
  - `@layer base` body defaults
  - Scrollbar utilities (`no-scrollbar`, `custom-scrollbar`)

---

## 2. Shell Architecture

### New directory: `src/context/`

Create `src/context/` — does not exist yet in the project.

### New context files

**`src/context/SidebarContext.jsx`** (ported from reference `src/context/SidebarContext.tsx`)
- State: `isExpanded` (bool), `isHovered` (bool), `isMobileOpen` (bool)
- Actions: `toggleSidebar()`, `setIsHovered(bool)`, `toggleMobileSidebar()`
- `isExpanded` persists across renders; toggled by the header button on desktop

**`src/context/ThemeContext.jsx`** (ported from reference `src/context/ThemeContext.tsx`)
- State: `theme` (`'light'` | `'dark'`)
- Persists to `localStorage` under key `theme`
- On mount and on change: adds/removes `dark` class on `document.documentElement`
- Exposes `toggleTheme()`

### New layout/component files

**`src/components/AppLayout.jsx`** — replaces `DefaultLayout.jsx`
- Wraps the tree in `<SidebarProvider>` and `<ThemeProvider>`
- Renders: `<AppSidebar />`, `<Backdrop />`, `<AppHeader />`, `<Outlet />`
- Content area shifts right by `290px` when expanded/hovered, `90px` when collapsed (matches TailAdmin v4 `LayoutContent`)

**`src/components/AppSidebar.jsx`** — replaces `Sidebar.jsx`
- Width: `290px` expanded, `90px` collapsed (icon-only rail)
- Hover-to-expand: `onMouseEnter` → `setIsHovered(true)`, `onMouseLeave` → `setIsHovered(false)` (only when not pinned expanded)
- Mobile: translates off-screen (`-translate-x-full`) when `isMobileOpen` is false, slides in when true
- Logo: shows full "Membership" text when expanded/hovered, shows icon-only when collapsed
- Nav items: flat list (no submenus — our nav is flat); sourced from `config.js` `NAV_ITEMS`, filtered by role, labeled via i18n
- Active item: `menu-item-active` utility class; inactive: `menu-item-inactive`
- Section headings ("MENU", "ACCOUNT"): shown as text when expanded, shown as `···` dots icon when collapsed

**`src/components/AppHeader.jsx`** — replaces `Header.jsx`
- Left: hamburger button (mobile) / sidebar pin-toggle (desktop)
- Right: language toggle button, dark mode toggle button, user avatar dropdown
- Dark mode toggle: calls `toggleTheme()` from `ThemeContext`; shows sun/moon icon
- User dropdown: email, role, logout — same logic as current `Header.jsx`
- Sticky, `z-[99999]`, `bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800`

**`src/components/Backdrop.jsx`** — new
- Semi-transparent overlay (`bg-gray-900/50`) shown on mobile when `isMobileOpen` is true
- Click → `toggleMobileSidebar()`

### Removed files
- `src/components/DefaultLayout.jsx`
- `src/components/Sidebar.jsx`
- `src/components/Header.jsx`

### Router change
- `src/services/router.jsx`: update `DefaultLayout` import → `AppLayout`

---

## 3. Page-Level Restyling

### Shared design tokens (all pages)

| Element | Classes |
|---|---|
| Card/panel | `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-theme-sm p-6` |
| Table wrapper | `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden` |
| Table header cell | `px-4 py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-left` |
| Table body cell | `px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300` |
| Primary button | `bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-4 py-2.5 text-theme-sm font-medium` |
| Secondary button | `border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg px-4 py-2.5 text-theme-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800` |
| Text input | `w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-theme-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500` |
| Select | Same as text input |
| Page heading | `text-title-sm font-semibold text-gray-900 dark:text-white` |
| Success badge | `inline-flex items-center rounded-full bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 px-2.5 py-0.5 text-theme-xs font-medium` |
| Error/danger badge | `inline-flex items-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400 px-2.5 py-0.5 text-theme-xs font-medium` |
| Warning badge | `inline-flex items-center rounded-full bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400 px-2.5 py-0.5 text-theme-xs font-medium` |

### Per-page scope

| File | Changes |
|---|---|
| `pages/login/Login.jsx` | Centered auth card; brand-colored submit button; inputs use new token classes; matches TailAdmin v4 SignIn layout |
| `pages/dashboard/Dashboard.jsx` | Page heading, loading skeleton, error state use v4 tokens |
| `pages/dashboard/StatsCard.jsx` | Card with icon circle, value, label — v4 card pattern |
| `pages/dashboard/OrgUnitsTable.jsx` | v4 table wrapper + header/row classes |
| `pages/dashboard/FormsStatusDonut.jsx` | v4 card wrapper; legend badges |
| `pages/members/MembersList.jsx` | v4 table; status badges; action buttons |
| `pages/members/MemberDetails.jsx` | v4 card; field layout; back/edit buttons |
| `pages/members/MemberEdit.jsx` | v4 card; form inputs; save/cancel buttons |
| `pages/members/MemberCreate.jsx` | v4 card; form inputs |
| `pages/members/MemberForm.jsx` | Shared form component — v4 input/select/label patterns |
| `pages/forms/FormsList.jsx` | v4 table; status badges |
| `pages/forms/FormDetails.jsx` | v4 card; image grid; status badge |
| `pages/forms/FormUpload.jsx` | v4 card; file input area |
| `pages/org-units/OrgUnits.jsx` | v4 table with city/municipal hierarchy |
| `pages/functions/Functions.jsx` | v4 table |
| `pages/users/Users.jsx` | v4 table |
| `pages/profile/Profile.jsx` | v4 card; form inputs; change-password section |

---

## 4. What Does NOT Change

- All API calls, business logic, validation, i18n translations
- `config.js` NAV_ITEMS structure
- `framework/` files (`api.js`, `auth.js`, `private-route.jsx`)
- `services/router.jsx` route definitions (only the layout component reference changes)
- Backend — no changes
- Recharts usage in `FormsStatusDonut` — keep recharts, just restyle the wrapper card

---

## 5. Out of Scope

- ApexCharts, FullCalendar, jVectorMap, Swiper — not in our app, not added
- TailAdmin v4 UI component library pages (Alerts, Badges, Avatars pages) — not applicable
- TypeScript migration — stay on JSX throughout
- Tailwind v4 `@tailwindcss/forms` plugin — not used (we style inputs manually)
