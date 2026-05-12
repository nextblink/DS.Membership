# TailAdmin v4 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `src/client/MembershipAdmin` from Tailwind CSS v3 to v4, add a collapsible sidebar with dark mode, and restyle every page to match the TailAdmin v4 design.

**Architecture:** Replace the Tailwind v3 PostCSS pipeline with the native `@tailwindcss/vite` plugin. Introduce `SidebarContext` and `ThemeContext`, port the TailAdmin v4 collapsible sidebar + header shell to JSX, then restyle all pages using the v4 token set (brand/gray/success/error/warning scales, Outfit font, shadow-theme-* shadows).

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, react-router-dom 7, react-i18next, recharts. Reference: `docs/free-react-tailwind-admin-dashboard-main/`.

---

## Token mapping reference (used in every page task)

| Old (v3) | New (v4) |
|---|---|
| `border-stroke` | `border-gray-200 dark:border-gray-800` |
| `bg-gray-2` | `bg-gray-50 dark:bg-gray-800/50` |
| `text-black` | `text-gray-900 dark:text-white` |
| `text-body` | `text-gray-500 dark:text-gray-400` |
| `text-bodydark2` | `text-gray-400 dark:text-gray-500` |
| `bg-white` (card) | `bg-white dark:bg-gray-900` |
| `bg-primary` | `bg-brand-500` |
| `text-primary` | `text-brand-500` |
| `hover:bg-opacity-90` | `hover:bg-brand-600` |
| `border-primary` | `border-brand-500` |
| `focus:border-primary` | `focus:border-brand-500` |
| `rounded-sm` (card) | `rounded-xl` |
| `rounded-sm` (input/button) | `rounded-lg` |
| `rounded-md` | `rounded-lg` |
| `rounded` | `rounded-lg` |
| `shadow-default` | `shadow-theme-sm` |
| `text-sm` | `text-theme-sm` |
| `text-xs` | `text-theme-xs` |
| `text-success` | `text-success-600 dark:text-success-400` |
| `text-danger` / `text-red-600` | `text-error-500 dark:text-error-400` |
| `bg-danger/10` | `bg-error-50 dark:bg-error-500/10` |
| `border-danger` | `border-error-300 dark:border-error-700` |
| `bg-danger` (hover) | `bg-error-500` |
| `text-warning` | `text-warning-600 dark:text-warning-400` |
| `bg-warning/10` | `bg-warning-50 dark:bg-warning-500/10` |
| `bg-primary/10` | `bg-brand-50 dark:bg-brand-500/10` |
| `bg-success/10` | `bg-success-50 dark:bg-success-500/10` |
| `dark:bg-boxdark` | `dark:bg-gray-900` |
| `dark:border-strokedark` | `dark:border-gray-800` |
| `dark:bg-meta-4` | `dark:bg-gray-800` |
| `bg-whiten` | `bg-gray-50 dark:bg-gray-950` |
| `px-7.5` | `px-6` |

---

## File map

**Create (new files):**
- `src/client/MembershipAdmin/src/context/SidebarContext.jsx`
- `src/client/MembershipAdmin/src/context/ThemeContext.jsx`
- `src/client/MembershipAdmin/src/components/AppLayout.jsx`
- `src/client/MembershipAdmin/src/components/AppSidebar.jsx`
- `src/client/MembershipAdmin/src/components/AppHeader.jsx`
- `src/client/MembershipAdmin/src/components/Backdrop.jsx`

**Modify:**
- `src/client/MembershipAdmin/package.json` — swap Tailwind v3 → v4 deps
- `src/client/MembershipAdmin/vite.config.js` — add `@tailwindcss/vite` plugin
- `src/client/MembershipAdmin/src/index.css` — replace with TailAdmin v4 CSS
- `src/client/MembershipAdmin/src/services/router.jsx` — import AppLayout
- All page files (class restyle only, no logic changes)

**Delete:**
- `src/client/MembershipAdmin/tailwind.config.js`
- `src/client/MembershipAdmin/postcss.config.js`
- `src/client/MembershipAdmin/src/components/DefaultLayout.jsx`
- `src/client/MembershipAdmin/src/components/Sidebar.jsx`
- `src/client/MembershipAdmin/src/components/Header.jsx`

---

## Task 1: Upgrade to Tailwind v4

**Files:**
- Modify: `src/client/MembershipAdmin/package.json`
- Modify: `src/client/MembershipAdmin/vite.config.js`
- Modify: `src/client/MembershipAdmin/src/index.css`
- Delete: `src/client/MembershipAdmin/tailwind.config.js`
- Delete: `src/client/MembershipAdmin/postcss.config.js`

- [ ] **Step 1: Update package.json**

Replace the file at `src/client/MembershipAdmin/package.json` with:

```json
{
  "name": "membershipadmin",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.16.0",
    "clsx": "^2.1.1",
    "i18next": "^26.1.0",
    "i18next-browser-languagedetector": "^8.2.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-hook-form": "^7.75.0",
    "react-i18next": "^17.0.7",
    "react-router-dom": "^7.15.0",
    "recharts": "^3.8.1",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "tailwindcss": "^4",
    "vite": "^8.0.12"
  }
}
```

- [ ] **Step 2: Update vite.config.js**

Replace the file at `src/client/MembershipAdmin/vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
  },
  preview: {
    port: 5180,
  },
})
```

- [ ] **Step 3: Delete old Tailwind config files**

```powershell
Remove-Item "src/client/MembershipAdmin/tailwind.config.js"
Remove-Item "src/client/MembershipAdmin/postcss.config.js"
```

- [ ] **Step 4: Replace index.css with TailAdmin v4 CSS**

Copy the full content of `docs/free-react-tailwind-admin-dashboard-main/src/index.css` into `src/client/MembershipAdmin/src/index.css`, replacing the existing file entirely.

The file starts with `@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap") layer(base);` and contains the full `@theme { ... }` block, `@custom-variant dark`, `@layer base`, and all `@utility` definitions.

- [ ] **Step 5: Install dependencies**

```powershell
cd src/client/MembershipAdmin
npm install
```

Expected: packages install without errors. `node_modules/tailwindcss` should be v4.x.

- [ ] **Step 6: Verify build compiles**

```powershell
npm run build
```

Expected: build completes successfully. There will be CSS class warnings for old tokens (like `border-stroke`) — these are expected and will be fixed in later tasks.

- [ ] **Step 7: Commit**

```powershell
git add src/client/MembershipAdmin/package.json src/client/MembershipAdmin/package-lock.json src/client/MembershipAdmin/vite.config.js src/client/MembershipAdmin/src/index.css
git commit -m "chore: upgrade to Tailwind CSS v4 with @tailwindcss/vite plugin"
```

---

## Task 2: Create SidebarContext and ThemeContext

**Files:**
- Create: `src/client/MembershipAdmin/src/context/SidebarContext.jsx`
- Create: `src/client/MembershipAdmin/src/context/ThemeContext.jsx`

- [ ] **Step 1: Create the context directory and SidebarContext**

Create `src/client/MembershipAdmin/src/context/SidebarContext.jsx`:

```jsx
import { createContext, useContext, useState } from 'react'

const SidebarContext = createContext(null)

export function SidebarProvider({ children }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  function toggleSidebar() {
    setIsExpanded((v) => !v)
  }

  function toggleMobileSidebar() {
    setIsMobileOpen((v) => !v)
  }

  return (
    <SidebarContext.Provider
      value={{ isExpanded, isHovered, isMobileOpen, setIsHovered, toggleSidebar, toggleMobileSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider')
  return ctx
}
```

- [ ] **Step 2: Create ThemeContext**

Create `src/client/MembershipAdmin/src/context/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'light')

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
```

- [ ] **Step 3: Verify build**

```powershell
npm run build
```

Expected: build passes.

- [ ] **Step 4: Commit**

```powershell
git add src/client/MembershipAdmin/src/context/
git commit -m "feat: add SidebarContext and ThemeContext"
```

---

## Task 3: Create Backdrop and AppLayout

**Files:**
- Create: `src/client/MembershipAdmin/src/components/Backdrop.jsx`
- Create: `src/client/MembershipAdmin/src/components/AppLayout.jsx`

- [ ] **Step 1: Create Backdrop**

Create `src/client/MembershipAdmin/src/components/Backdrop.jsx`:

```jsx
import { useSidebar } from '../context/SidebarContext'

export default function Backdrop() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()
  if (!isMobileOpen) return null
  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
      onClick={toggleMobileSidebar}
    />
  )
}
```

- [ ] **Step 2: Create AppLayout**

Create `src/client/MembershipAdmin/src/components/AppLayout.jsx`:

```jsx
import { Outlet } from 'react-router-dom'
import { SidebarProvider, useSidebar } from '../context/SidebarContext'
import { ThemeProvider } from '../context/ThemeContext'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import Backdrop from './Backdrop'

function LayoutContent() {
  const { isExpanded, isHovered } = useSidebar()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]'
        }`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-screen-2xl md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <LayoutContent />
      </SidebarProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: Verify build**

```powershell
npm run build
```

Expected: build passes (AppSidebar and AppHeader don't exist yet, so expect import errors — that's fine at this stage if you're working sequentially; otherwise create them all before building).

- [ ] **Step 4: Commit**

```powershell
git add src/client/MembershipAdmin/src/components/Backdrop.jsx src/client/MembershipAdmin/src/components/AppLayout.jsx
git commit -m "feat: add Backdrop and AppLayout shell components"
```

---

## Task 4: Create AppSidebar

**Files:**
- Create: `src/client/MembershipAdmin/src/components/AppSidebar.jsx`

- [ ] **Step 1: Create AppSidebar**

Create `src/client/MembershipAdmin/src/components/AppSidebar.jsx`:

```jsx
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../context/SidebarContext'
import auth from '../framework/auth'
import { NAV_ITEMS } from '../config'

const ICONS = {
  home: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  document: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  building: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clipboard: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  'user-group': (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  'user-circle': (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const NAV_I18N_KEY = {
  home: 'nav.dashboard',
  users: 'nav.members',
  document: 'nav.forms',
  building: 'nav.orgUnits',
  clipboard: 'nav.functions',
  'user-group': 'nav.users',
  'user-circle': 'nav.profile',
}

function NavItem({ item, showLabel, t }) {
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === '/dashboard'}
        className={({ isActive }) =>
          `menu-item group ${isActive ? 'menu-item-active' : 'menu-item-inactive'} ${
            !showLabel ? 'justify-center' : ''
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`menu-item-icon-size ${
                isActive ? 'menu-item-icon-active' : 'menu-item-icon-inactive'
              }`}
            >
              {ICONS[item.iconName]}
            </span>
            {showLabel && (
              <span className="text-theme-sm">
                {t(NAV_I18N_KEY[item.iconName] || item.label)}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

export default function AppSidebar() {
  const { isExpanded, isHovered, isMobileOpen, setIsHovered, toggleMobileSidebar } = useSidebar()
  const { t } = useTranslation('common')
  const role = auth.getRole()

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.length === 0 || (role && item.roles.includes(role)),
  )
  const mainItems = items.filter((i) => i.section === 'main')
  const accountItems = items.filter((i) => i.section === 'account')
  const showLabels = isExpanded || isHovered || isMobileOpen

  return (
    <aside
      className={`fixed top-0 left-0 z-[99999] flex h-screen flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 ease-in-out
        ${isExpanded || isHovered ? 'w-[290px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo row */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800 px-5 ${
          !showLabels ? 'justify-center' : 'justify-between'
        }`}
      >
        {showLabels ? (
          <>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">
              Membership
            </span>
            <button
              className="block lg:hidden p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              onClick={toggleMobileSidebar}
              aria-label="Close sidebar"
            >
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            M
          </span>
        )}
      </div>

      {/* Nav */}
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar py-5 px-4">
        {mainItems.length > 0 && (
          <div className="mb-6">
            {showLabels && (
              <h2 className="mb-3 px-3 text-theme-xs font-medium uppercase text-gray-400">
                {t('nav.mainMenu')}
              </h2>
            )}
            <ul className="flex flex-col gap-1">
              {mainItems.map((item) => (
                <NavItem key={item.to} item={item} showLabel={showLabels} t={t} />
              ))}
            </ul>
          </div>
        )}
        {accountItems.length > 0 && (
          <div>
            {showLabels && (
              <h2 className="mb-3 px-3 text-theme-xs font-medium uppercase text-gray-400">
                {t('nav.account')}
              </h2>
            )}
            <ul className="flex flex-col gap-1">
              {accountItems.map((item) => (
                <NavItem key={item.to} item={item} showLabel={showLabels} t={t} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify build**

```powershell
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```powershell
git add src/client/MembershipAdmin/src/components/AppSidebar.jsx
git commit -m "feat: add collapsible AppSidebar with TailAdmin v4 design"
```

---

## Task 5: Create AppHeader

**Files:**
- Create: `src/client/MembershipAdmin/src/components/AppHeader.jsx`

- [ ] **Step 1: Create AppHeader**

Create `src/client/MembershipAdmin/src/components/AppHeader.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
import auth from '../framework/auth'

export default function AppHeader() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('common')
  const { toggleSidebar, toggleMobileSidebar } = useSidebar()
  const { theme, toggleTheme } = useTheme()
  const user = auth.getUser()
  const email = user?.email || 'Account'
  const role = user?.role
  const initial = (email[0] || 'A').toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onClickAway(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  function handleLogout() {
    auth.logout()
    setMenuOpen(false)
    navigate('/login', { replace: true })
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language === 'en' ? 'sr' : 'en')
  }

  return (
    <header className="sticky top-0 z-[9999] flex w-full bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="flex w-full items-center justify-between px-4 py-3 md:px-6">
        {/* Left: sidebar toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            aria-label="Open sidebar"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Right: lang, theme, user */}
        <div className="flex items-center gap-3" ref={menuRef}>
          <button
            type="button"
            onClick={toggleLang}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {i18n.language === 'en' ? 'СР' : 'EN'}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid="user-menu-toggle"
            >
              <span className="hidden text-right sm:block">
                <span className="block text-theme-sm font-medium text-gray-900 dark:text-white">{email}</span>
                {role && <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{role}</span>}
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                {initial}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-lg py-2"
              >
                <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-3">
                  <div className="text-theme-sm font-medium text-gray-900 dark:text-white">{email}</div>
                  {role && <div className="text-theme-xs text-gray-500 dark:text-gray-400">{role}</div>}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  data-testid="logout-button"
                  className="flex w-full items-center px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {t('header.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify build**

```powershell
npm run build
```

Expected: build passes.

- [ ] **Step 3: Commit**

```powershell
git add src/client/MembershipAdmin/src/components/AppHeader.jsx
git commit -m "feat: add AppHeader with dark mode toggle and collapsible sidebar support"
```

---

## Task 6: Wire AppLayout into router, delete old layout files

**Files:**
- Modify: `src/client/MembershipAdmin/src/services/router.jsx`
- Delete: `src/client/MembershipAdmin/src/components/DefaultLayout.jsx`
- Delete: `src/client/MembershipAdmin/src/components/Sidebar.jsx`
- Delete: `src/client/MembershipAdmin/src/components/Header.jsx`

- [ ] **Step 1: Update router.jsx**

Replace the import at line 5 of `src/client/MembershipAdmin/src/services/router.jsx`:

Old:
```js
import DefaultLayout from '../components/DefaultLayout'
```

New:
```js
import AppLayout from '../components/AppLayout'
```

Then replace the layout element reference at lines 38–43:

Old:
```jsx
      <Route
        element={
          <PrivateRoute>
            <DefaultLayout />
          </PrivateRoute>
        }
      >
```

New:
```jsx
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
```

- [ ] **Step 2: Delete old layout files**

```powershell
Remove-Item "src/client/MembershipAdmin/src/components/DefaultLayout.jsx"
Remove-Item "src/client/MembershipAdmin/src/components/Sidebar.jsx"
Remove-Item "src/client/MembershipAdmin/src/components/Header.jsx"
```

- [ ] **Step 3: Build and start dev server**

```powershell
npm run build
npm run dev
```

Expected: build passes. Dev server starts on port 5180. Open `http://localhost:5180` — login page loads, after login the sidebar is visible (full width), header shows dark mode toggle and language toggle. Sidebar collapses to icon rail on desktop when toggled.

- [ ] **Step 4: Commit**

```powershell
git add src/client/MembershipAdmin/src/services/router.jsx
git commit -m "feat: wire AppLayout into router, remove legacy layout components"
```

---

## Task 7: Restyle Login page

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/login/Login.jsx`

- [ ] **Step 1: Replace Login.jsx**

Replace the entire file `src/client/MembershipAdmin/src/pages/login/Login.jsx` with:

```jsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../../framework/auth'

export default function Login() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } })

  const onSubmit = async ({ email, password }) => {
    setSubmitError(null)
    try {
      await auth.login(email, password)
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        setSubmitError(t('error.invalidCredentials'))
      } else {
        setSubmitError(err?.response?.data?.message || err?.message || t('error.generic'))
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-theme-md">
        <div className="mb-8 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-500 text-xl font-bold text-white mb-4">
            M
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('email.label')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: t('email.required'),
                pattern: { value: /^\S+@\S+$/, message: t('email.invalid') },
              })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400"
              placeholder={t('email.placeholder')}
            />
            {errors.email && (
              <p className="mt-1.5 text-theme-xs text-error-500">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('password.label')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: t('password.required') })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400"
              placeholder={t('password.placeholder')}
            />
            {errors.password && (
              <p className="mt-1.5 text-theme-xs text-error-500">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <div
              data-testid="login-error"
              className="mb-5 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="login-submit"
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 px-6 py-3 text-theme-sm font-medium text-white transition disabled:opacity-60"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify visually**

Start dev server, navigate to `/login`. Expected: centered card with brand-colored logo mark, clean input fields, brand-colored submit button.

- [ ] **Step 3: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/login/Login.jsx
git commit -m "feat: restyle Login page to TailAdmin v4"
```

---

## Task 8: Restyle Dashboard components

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/StatsCard.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/OrgUnitsTable.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/FormsStatusDonut.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`

- [ ] **Step 1: Replace StatsCard.jsx**

Replace `src/client/MembershipAdmin/src/pages/dashboard/StatsCard.jsx` with:

```jsx
export default function StatsCard({ label, value, sublabel, icon, iconColor = 'bg-brand-50 dark:bg-brand-500/10' }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-6 shadow-theme-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconColor}`}>
        {icon}
      </div>
      <div className="mt-5">
        <h4 className="text-3xl font-bold text-gray-900 dark:text-white">{value}</h4>
        <span className="mt-1 block text-theme-sm text-gray-500 dark:text-gray-400">{label}</span>
        {sublabel && (
          <div className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">{sublabel}</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace OrgUnitsTable.jsx**

Replace `src/client/MembershipAdmin/src/pages/dashboard/OrgUnitsTable.jsx` with:

```jsx
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function computePercentage(row) {
  if (typeof row.percentage === 'number') return row.percentage
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 100
  return 0
}

export default function OrgUnitsTable({ rows }) {
  const { t } = useTranslation('dashboard')
  const columns = [
    { key: 'name', label: t('orgTable.orgUnit'), numeric: false },
    { key: 'memberCount', label: t('orgTable.members'), numeric: true },
    { key: 'voterCount', label: t('orgTable.voters'), numeric: true },
    { key: 'percentage', label: t('orgTable.percentage'), numeric: true },
  ]
  const [sortKey, setSortKey] = useState('memberCount')
  const [sortDir, setSortDir] = useState('desc')

  const normalized = useMemo(
    () =>
      (rows || []).map((r) => ({
        orgUnitId: r.orgUnitId,
        name: r.name,
        memberCount: r.memberCount ?? 0,
        voterCount: r.voterCount ?? 0,
        percentage: computePercentage(r),
      })),
    [rows],
  )

  const sorted = useMemo(() => {
    const arr = [...normalized]
    const col = columns.find((c) => c.key === sortKey)
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp
      if (col?.numeric) cmp = (av ?? 0) - (bv ?? 0)
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [normalized, sortKey, sortDir])

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(columns.find((c) => c.key === key)?.numeric ? 'desc' : 'asc')
    }
  }

  function sortIndicator(key) {
    if (key !== sortKey) return <span className="ml-1 text-gray-400 dark:text-gray-600">⇅</span>
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 pb-2.5 pt-6 shadow-theme-sm sm:px-7">
      <h4 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
        {t('orgTable.title')}
      </h4>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`min-w-[80px] cursor-pointer select-none px-4 py-3 text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400 ${
                    c.numeric ? 'text-right' : ''
                  }`}
                  onClick={() => toggleSort(c.key)}
                  aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {c.label}
                  {sortIndicator(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('orgTable.noData')}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.orgUnitId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{row.name}</td>
                  <td className="px-4 py-3 text-right text-theme-sm text-gray-700 dark:text-gray-300">
                    {row.memberCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-theme-sm text-gray-700 dark:text-gray-300">
                    {row.voterCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-theme-sm font-medium text-brand-500">
                    {row.percentage.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace FormsStatusDonut.jsx**

Read the current `src/client/MembershipAdmin/src/pages/dashboard/FormsStatusDonut.jsx`, then replace its wrapper classes. Replace the file with the same recharts logic but updated card wrapper:

```jsx
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
  Pending: '#f79009',
  Verified: '#12b76a',
  Rejected: '#f04438',
}

export default function FormsStatusDonut({ formsByStatus = {} }) {
  const { t } = useTranslation(['dashboard', 'enums'])

  const data = [
    { name: t('enums:formStatus.pending'), value: formsByStatus.pending ?? 0, key: 'Pending' },
    { name: t('enums:formStatus.verified'), value: formsByStatus.verified ?? 0, key: 'Verified' },
    { name: t('enums:formStatus.rejected'), value: formsByStatus.rejected ?? 0, key: 'Rejected' },
  ].filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm h-full">
      <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('donut.title')}</h3>
      </div>
      <div className="px-6 py-6">
        {total === 0 ? (
          <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">{t('donut.noData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key] ?? '#98a2b3'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e4e7ec',
                  fontSize: '12px',
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span className="text-theme-xs text-gray-600 dark:text-gray-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update Dashboard.jsx class tokens**

In `src/client/MembershipAdmin/src/pages/dashboard/Dashboard.jsx`, apply these string replacements:

1. `"rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark"` → `"rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-6 shadow-theme-sm"`
2. `"animate-pulse rounded-sm bg-gray-2 dark:bg-meta-4"` → `"animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"`
3. `"rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark"` → `"rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm"`
4. `"rounded-sm border border-danger/30 bg-danger/5 p-6 text-center shadow-default"` → `"rounded-xl border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/5 p-6 text-center shadow-theme-sm"`
5. `"text-2xl font-semibold text-black dark:text-white"` → `"text-2xl font-semibold text-gray-900 dark:text-white"`
6. `"text-lg font-semibold text-danger"` → `"text-lg font-semibold text-error-600 dark:text-error-400"`
7. `"text-sm text-body"` → `"text-theme-sm text-gray-500 dark:text-gray-400"`
8. `"inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-center font-medium text-white hover:bg-opacity-90"` → `"inline-flex items-center justify-center rounded-lg bg-brand-500 hover:bg-brand-600 px-6 py-2 text-center text-theme-sm font-medium text-white"`
9. Icon class `"h-6 w-6 text-primary"` → `"h-6 w-6 text-brand-500"`
10. Icon class `"h-6 w-6 text-success"` → `"h-6 w-6 text-success-600 dark:text-success-400"`
11. Icon class `"h-6 w-6 text-warning"` → `"h-6 w-6 text-warning-600 dark:text-warning-400"`
12. Icon class `"h-6 w-6 text-danger"` → `"h-6 w-6 text-error-500"`
13. `iconColor="bg-primary/10"` → `iconColor="bg-brand-50 dark:bg-brand-500/10"`
14. `iconColor="bg-success/10"` → `iconColor="bg-success-50 dark:bg-success-500/10"`
15. `iconColor="bg-warning/10"` → `iconColor="bg-warning-50 dark:bg-warning-500/10"`
16. `iconColor="bg-danger/10"` → `iconColor="bg-error-50 dark:bg-error-500/10"`

- [ ] **Step 5: Verify visually**

With dev server running, open `/dashboard`. Expected: four stats cards with rounded-xl corners and shadow, OrgUnits table with clean dark-mode-aware borders, donut chart in its own card.

- [ ] **Step 6: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/dashboard/
git commit -m "feat: restyle Dashboard, StatsCard, OrgUnitsTable, FormsStatusDonut to TailAdmin v4"
```

---

## Task 9: Restyle MemberForm (shared component)

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberForm.jsx`

- [ ] **Step 1: Update class constants at top of MemberForm.jsx**

In `src/client/MembershipAdmin/src/pages/members/MemberForm.jsx`, replace the class constant block (lines 22–28):

Old:
```js
const sectionClass = 'rounded border border-stroke bg-white p-5 shadow-sm mb-6'
const sectionTitleClass = 'text-lg font-semibold text-black mb-4 border-b border-stroke pb-2'
const labelClass = 'block text-sm font-medium text-black mb-1'
const inputClass =
  'w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none'
const errorClass = 'text-xs text-red-600 mt-1'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4'
```

New:
```js
const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const sectionTitleClass = 'text-base font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-3'
const labelClass = 'block text-theme-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5'
const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const errorClass = 'text-theme-xs text-error-500 mt-1'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-4'
```

- [ ] **Step 2: Update error alert at top of form**

Old:
```jsx
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
```

New:
```jsx
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
```

- [ ] **Step 3: Update add/remove phone and function button classes**

Old (add phone/function):
```jsx
className="text-sm text-primary hover:underline"
```

New:
```jsx
className="text-theme-sm text-brand-500 hover:underline"
```

Old (remove phone/function):
```jsx
className="px-3 py-2 text-sm text-red-600 hover:underline"
```

New:
```jsx
className="px-3 py-2 text-theme-sm text-error-500 hover:underline"
```

- [ ] **Step 4: Update submit and cancel buttons**

Old submit button:
```jsx
          className="rounded bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
```

New:
```jsx
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
```

Old cancel button:
```jsx
          className="rounded border border-stroke px-5 py-2 text-sm text-black hover:bg-gray-50"
```

New:
```jsx
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
```

- [ ] **Step 5: Update checkbox label**

Old:
```jsx
            <span className="text-sm text-black">{t('members:form.isPublicCompany')}</span>
```

New:
```jsx
            <span className="text-theme-sm text-gray-900 dark:text-white">{t('members:form.isPublicCompany')}</span>
```

- [ ] **Step 6: Update required asterisk in Field component**

Old:
```jsx
        {required && <span className="text-red-600 ml-0.5">*</span>}
```

New:
```jsx
        {required && <span className="text-error-500 ml-0.5">*</span>}
```

- [ ] **Step 7: Verify build**

```powershell
npm run build
```

- [ ] **Step 8: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/members/MemberForm.jsx
git commit -m "feat: restyle MemberForm shared component to TailAdmin v4"
```

---

## Task 10: Restyle MembersList

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/members/MembersList.jsx`

- [ ] **Step 1: Update class constants at top of MembersList.jsx**

Old:
```js
const inputClass =
  'w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none'
const labelClass = 'block text-xs font-medium text-body mb-1'
```

New:
```js
const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-theme-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5'
```

- [ ] **Step 2: Update outer card wrapper**

Old:
```jsx
    <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
```

New:
```jsx
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
```

- [ ] **Step 3: Update card header**

Old:
```jsx
      <div className="flex items-center justify-between border-b border-stroke px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-black">{t('title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
```

New:
```jsx
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
        >
```

- [ ] **Step 4: Update filter section**

Old:
```jsx
      <form onSubmit={applyFilters} className="border-b border-stroke bg-gray-2 px-5 py-4">
```

New:
```jsx
      <form onSubmit={applyFilters} className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-6 py-4">
```

Old filter buttons:
```jsx
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
```
New:
```jsx
          <button
            type="submit"
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
          >
```

Old clear button:
```jsx
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-stroke bg-white px-4 py-2 text-sm text-black hover:bg-gray-2"
          >
```
New:
```jsx
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
```

- [ ] **Step 5: Update table**

Old:
```jsx
          <thead className="bg-gray-2 text-xs uppercase text-body">
```
New:
```jsx
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
```

Old row:
```jsx
                  className="border-t border-stroke hover:bg-gray-2 cursor-pointer"
```
New:
```jsx
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
```

Old cell:
```jsx
                  <td className="px-4 py-3 text-black">
```
New:
```jsx
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">
```

Replace remaining plain `<td className="px-4 py-3">` with `<td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">`.

Loading/error/empty cells:
- `"px-4 py-6 text-center text-body"` → `"px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"`
- `"px-4 py-6 text-center text-red-600"` → `"px-4 py-6 text-center text-theme-sm text-error-500"`

- [ ] **Step 6: Update pagination**

Old:
```jsx
      <div className="flex items-center justify-between border-t border-stroke px-5 py-4 text-sm">
        <div className="text-body">
```
New:
```jsx
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
```

Old pagination buttons:
```jsx
            className="rounded-md border border-stroke px-3 py-1 disabled:opacity-50 hover:bg-gray-2"
```
New:
```jsx
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
```

- [ ] **Step 7: Verify visually**

Navigate to `/members`. Expected: card with clean borders, filter bar with v4 inputs, table with proper spacing and dark mode support.

- [ ] **Step 8: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/members/MembersList.jsx
git commit -m "feat: restyle MembersList to TailAdmin v4"
```

---

## Task 11: Restyle MemberDetails, MemberCreate, MemberEdit

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberDetails.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/members/MemberEdit.jsx`

- [ ] **Step 1: Update class constants in MemberDetails.jsx**

Old:
```js
const labelClass = 'text-xs uppercase text-body'
const valueClass = 'text-sm text-black'
const sectionClass = 'rounded border border-stroke bg-white p-5 shadow-sm mb-6'
const sectionTitleClass = 'text-lg font-semibold text-black mb-4 border-b border-stroke pb-2'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
```

New:
```js
const labelClass = 'text-theme-xs uppercase font-medium text-gray-500 dark:text-gray-400'
const valueClass = 'text-theme-sm text-gray-900 dark:text-white mt-0.5'
const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const sectionTitleClass = 'text-base font-semibold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-800 pb-3'
const gridClass = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
```

- [ ] **Step 2: Update buttons in MemberDetails.jsx**

Old back button:
```jsx
            className="rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-50"
```
New:
```jsx
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
```

Old edit button:
```jsx
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
```
New:
```jsx
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
```

Old delete button:
```jsx
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
```
New:
```jsx
            className="rounded-lg bg-error-500 hover:bg-error-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
```

- [ ] **Step 3: Update loading/error states in MemberDetails.jsx**

Old loading:
```jsx
      <div className="p-6">
        <p className="text-sm text-body">{t('common:state.loading')}</p>
      </div>
```
New:
```jsx
      <div className="p-6">
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
      </div>
```

Old error state back button:
```jsx
          className="mt-3 rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-50"
```
New:
```jsx
          className="mt-3 rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
```

- [ ] **Step 4: Update heading and JMBG line in MemberDetails.jsx**

Old:
```jsx
          <h1 className="text-2xl font-semibold text-black">{fullName}</h1>
          <p className="text-sm text-body">JMBG {member.jmbg}</p>
```
New:
```jsx
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{fullName}</h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">JMBG {member.jmbg}</p>
```

- [ ] **Step 5: Update linked forms list in MemberDetails.jsx**

Old:
```jsx
              <Link to={`/forms/${f.id}`} className="text-primary hover:underline">
```
New:
```jsx
              <Link to={`/forms/${f.id}`} className="text-brand-500 hover:underline">
```

- [ ] **Step 6: Update MemberCreate.jsx**

In `src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx`, apply these exact replacements:

Old heading:
```jsx
      <h1 className="text-2xl font-semibold text-black mb-4">{t('members:newMember')}</h1>
```
New:
```jsx
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('members:newMember')}</h1>
```

- [ ] **Step 7: Update MemberEdit.jsx**

In `src/client/MembershipAdmin/src/pages/members/MemberEdit.jsx`, apply these exact replacements:

Old heading:
```jsx
      <h1 className="text-2xl font-semibold text-black mb-4">
```
New:
```jsx
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
```

Old loading state:
```jsx
        <p className="text-sm text-body">{t('common:state.loading')}</p>
```
New:
```jsx
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
```

Old load error state:
```jsx
        <p className="text-sm text-red-600">{loadError}</p>
```
New:
```jsx
        <p className="text-theme-sm text-error-500">{loadError}</p>
```

- [ ] **Step 8: Verify visually**

Navigate to `/members/1`. Expected: read-only sections with subtle gray labels, proper button colors.

- [ ] **Step 9: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/members/MemberDetails.jsx src/client/MembershipAdmin/src/pages/members/MemberCreate.jsx src/client/MembershipAdmin/src/pages/members/MemberEdit.jsx
git commit -m "feat: restyle MemberDetails, MemberCreate, MemberEdit to TailAdmin v4"
```

---

## Task 12: Restyle Forms pages

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/forms/FormsList.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/forms/FormDetails.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx`

- [ ] **Step 1: Update FormsList.jsx — StatusBadge component**

Old:
```js
const STATUS_CLASS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Verified: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
}
```
New:
```js
const STATUS_CLASS = {
  Pending: 'bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-700',
  Verified: 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 border-success-200 dark:border-success-700',
  Rejected: 'bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400 border-error-200 dark:border-error-700',
}
```

Old StatusBadge span:
```jsx
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
```
New:
```jsx
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-theme-xs font-medium ${cls}`}>
```

- [ ] **Step 2: Update FormsList.jsx — card, header, filter, table, pagination**

Apply the same structural changes as MembersList (Task 10, Steps 2–6), adapting for the forms table columns. Specifically:

- Outer card: `rounded-sm border border-stroke bg-white shadow-default` → `rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm`
- Card header: same pattern, `bg-primary` → `bg-brand-500 hover:bg-brand-600`
- Filter row: `bg-gray-2 border-stroke` → `bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-800`
- Filter inputs/selects: `rounded-sm border border-stroke bg-white ... focus:border-primary` → `rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 ... focus:border-brand-500`
- Filter buttons: `bg-primary hover:bg-opacity-90` → `bg-brand-500 hover:bg-brand-600`, clear button border/colors updated
- Table head: `bg-gray-2 text-xs uppercase text-body` → `bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400`
- Table rows: `border-stroke hover:bg-gray-2` → `border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30`
- Link: `text-primary` → `text-brand-500`
- Error cell: `text-red-600` → `text-error-500`
- Loading/empty cells: `text-body` → `text-gray-500 dark:text-gray-400`
- Pagination active page: `border-primary bg-primary text-white` → `border-brand-500 bg-brand-500 text-white`
- Pagination other buttons: `border-stroke text-body hover:bg-gray-2` → `border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800`

- [ ] **Step 3: Update FormDetails.jsx**

Read `src/client/MembershipAdmin/src/pages/forms/FormDetails.jsx`. Apply token mapping table at the top of this plan to all class strings. Key patterns:
- Card wrappers: `rounded-sm border border-stroke bg-white shadow-default` → `rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm`
- Section titles: `text-black` → `text-gray-900 dark:text-white`, `border-stroke` → `border-gray-200 dark:border-gray-800`
- Status badge: use the same `STATUS_CLASS` pattern as FormsList
- Buttons: `bg-primary` → `bg-brand-500 hover:bg-brand-600`, secondary buttons get `border-gray-300 dark:border-gray-700`
- `text-body` → `text-gray-500 dark:text-gray-400`

- [ ] **Step 4: Update FormUpload.jsx**

Read `src/client/MembershipAdmin/src/pages/forms/FormUpload.jsx`. Apply token mapping: card wrappers, form inputs, buttons, labels — same patterns as above.

- [ ] **Step 5: Verify visually**

Navigate to `/forms`. Expected: clean table with colored status badges (amber/green/red).

- [ ] **Step 6: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/forms/
git commit -m "feat: restyle Forms pages (FormsList, FormDetails, FormUpload) to TailAdmin v4"
```

---

## Task 13: Restyle OrgUnits, Functions, Users pages

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/org-units/OrgUnits.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/functions/Functions.jsx`
- Modify: `src/client/MembershipAdmin/src/pages/users/Users.jsx`

- [ ] **Step 1: Update OrgUnits.jsx — typeBadgeClass function**

Old:
```js
function typeBadgeClass(type) {
  if (type === TYPE_CITY) {
    return 'inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
  }
  return 'inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success'
}
```

New:
```js
function typeBadgeClass(type) {
  if (type === TYPE_CITY) {
    return 'inline-flex rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400'
  }
  return 'inline-flex rounded-full bg-success-50 dark:bg-success-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-success-700 dark:text-success-400'
}
```

- [ ] **Step 2: Update OrgUnits.jsx — AddUnitModal**

Old modal overlay:
```jsx
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="add-unit-modal">
      <div className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default">
        <div className="border-b border-stroke px-6 py-4">
          <h3 className="text-lg font-semibold text-black">
```
New:
```jsx
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4" data-testid="add-unit-modal">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
```

Old modal inputs:
```jsx
              className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary"
```
New:
```jsx
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
```

Old modal labels:
```jsx
            <label className="mb-2 block text-sm font-medium text-black">
```
New:
```jsx
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
```

Old modal error:
```jsx
            <p className="mb-3 text-sm text-danger" data-testid="modal-error">{error}</p>
```
New:
```jsx
            <p className="mb-3 text-theme-sm text-error-500" data-testid="modal-error">{error}</p>
```

Old modal cancel/save buttons:
```jsx
              className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
...
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
```
New:
```jsx
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
...
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
```

- [ ] **Step 3: Update OrgUnits.jsx — VoterCountEditor**

Old inline input:
```jsx
          className="w-24 rounded border border-stroke bg-white px-2 py-0.5 text-sm outline-none focus:border-primary"
```
New:
```jsx
          className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
```

Old click button:
```jsx
      className="rounded px-2 py-0.5 text-sm text-black hover:bg-gray-100"
```
New:
```jsx
      className="rounded-lg px-2 py-1 text-theme-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
```

Old error inline:
```jsx
          {error && <span className="ml-2 text-xs text-danger">{error}</span>}
```
New:
```jsx
          {error && <span className="ml-2 text-theme-xs text-error-500">{error}</span>}
```

- [ ] **Step 4: Update OrgUnits.jsx — TreeNode**

Old tree node row:
```jsx
        className="flex flex-wrap items-center gap-3 rounded border border-stroke bg-white px-3 py-2 hover:bg-gray-50"
```
New:
```jsx
        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
```

Old name span:
```jsx
        <span className="font-medium text-black" data-testid={`node-name-${node.id}`}>{node.name}</span>
```
New:
```jsx
        <span className="font-medium text-gray-900 dark:text-white" data-testid={`node-name-${node.id}`}>{node.name}</span>
```

Old stats spans:
```jsx
        <span className="text-sm text-body">
```
New:
```jsx
        <span className="text-theme-sm text-gray-500 dark:text-gray-400">
```

Old add-child button:
```jsx
            className="rounded border border-stroke px-3 py-1 text-xs font-medium text-black hover:bg-gray-50"
```
New:
```jsx
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
```

Old delete button:
```jsx
            className="rounded border border-danger px-3 py-1 text-xs font-medium text-danger hover:bg-danger hover:text-white"
```
New:
```jsx
            className="rounded-lg border border-error-300 dark:border-error-700 px-3 py-1.5 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-500 hover:text-white"
```

- [ ] **Step 5: Update OrgUnits.jsx — page heading and card wrapper**

Old page wrapper:
```jsx
        <h2 className="text-2xl font-semibold text-black">{t('orgUnits:title')}</h2>
        <button
          ...
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
```
New:
```jsx
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('orgUnits:title')}</h2>
        <button
          ...
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
```

Old card:
```jsx
      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default">
```
New:
```jsx
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm">
```

Old loading/error:
```jsx
            <p className="text-sm text-body" data-testid="org-units-loading">
            <p className="text-sm text-danger" data-testid="org-units-error">
```
New:
```jsx
            <p className="text-theme-sm text-gray-500 dark:text-gray-400" data-testid="org-units-loading">
            <p className="text-theme-sm text-error-500" data-testid="org-units-error">
```

- [ ] **Step 6: Update Functions.jsx**

Read `src/client/MembershipAdmin/src/pages/functions/Functions.jsx`. Apply token mapping: card wrapper, table head/rows, buttons. Typical patterns: `rounded-sm` → `rounded-xl`, `border-stroke` → `border-gray-200 dark:border-gray-800`, `text-black` → `text-gray-900 dark:text-white`, `bg-primary` → `bg-brand-500 hover:bg-brand-600`, `text-danger` → `text-error-500`.

- [ ] **Step 7: Update Users.jsx**

Read `src/client/MembershipAdmin/src/pages/users/Users.jsx`. Apply the same token mapping as Functions.jsx.

- [ ] **Step 8: Verify visually**

Navigate to `/org-units`, `/functions`, `/users`. Expected: consistent card and table styling, OrgUnits tree node rows have rounded-lg borders.

- [ ] **Step 9: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/org-units/OrgUnits.jsx src/client/MembershipAdmin/src/pages/functions/Functions.jsx src/client/MembershipAdmin/src/pages/users/Users.jsx
git commit -m "feat: restyle OrgUnits, Functions, Users pages to TailAdmin v4"
```

---

## Task 14: Restyle Profile page

**Files:**
- Modify: `src/client/MembershipAdmin/src/pages/profile/Profile.jsx`

- [ ] **Step 1: Update Profile.jsx**

Read `src/client/MembershipAdmin/src/pages/profile/Profile.jsx`. Apply the full token mapping:
- Card wrappers: `rounded-sm border border-stroke bg-white shadow-default` → `rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm`
- Section headings: `text-black` → `text-gray-900 dark:text-white`, `border-stroke` → `border-gray-200 dark:border-gray-800`
- Labels: `text-sm font-medium text-black` → `text-theme-sm font-medium text-gray-700 dark:text-gray-300`
- Inputs: `rounded border border-stroke bg-white ... focus:border-primary` → `rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 ... focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20`
- Primary button: `bg-primary hover:bg-opacity-90` → `bg-brand-500 hover:bg-brand-600`
- Secondary button: `border-stroke text-black` → `border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300`
- Error banners: `border-red-300 bg-red-50 text-red-700` → `border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400`
- Success banners: `border-green-300 bg-green-50 text-green-700` → `border-success-200 dark:border-success-700 bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400`

- [ ] **Step 2: Verify visually**

Navigate to `/profile`. Expected: two-card layout (info + change password) with consistent v4 styling.

- [ ] **Step 3: Final build check**

```powershell
npm run build
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```powershell
git add src/client/MembershipAdmin/src/pages/profile/Profile.jsx
git commit -m "feat: restyle Profile page to TailAdmin v4"
```

---

## Task 15: Final verification and cleanup

- [ ] **Step 1: Start dev server and do full smoke test**

```powershell
npm run dev
```

Open `http://localhost:5180`. Test:
1. Login page renders — card, inputs, button all look correct
2. After login, sidebar appears (full width, white bg, brand active items)
3. Toggle sidebar with header button → collapses to 90px icon rail
4. Hover collapsed sidebar → expands to 290px temporarily
5. Dark mode toggle works → page switches to dark theme, persists on reload
6. Language toggle works (EN ↔ СР)
7. Navigate all pages: Dashboard, Members list, Member detail, Forms list, Org Units, Functions, Users, Profile
8. No old v3 class names visible (no purple/indigo primary, no `boxdark` backgrounds)
9. Mobile viewport (≤1024px): sidebar hidden by default, hamburger opens it, backdrop dismisses it

- [ ] **Step 2: Check for leftover old tokens**

```powershell
cd src/client/MembershipAdmin/src
grep -r "bg-primary\|text-primary\|border-stroke\|bg-boxdark\|text-body\|bg-gray-2\|text-black\b\|rounded-sm\|shadow-default\|strokedark\|bg-whiten" --include="*.jsx" .
```

Fix any remaining occurrences using the token mapping table at the top of this plan.

- [ ] **Step 3: Final commit**

```powershell
git add -A
git commit -m "chore: final TailAdmin v4 migration cleanup"
```
