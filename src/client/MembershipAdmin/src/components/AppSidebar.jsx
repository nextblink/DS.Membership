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
  flag: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 21V4m0 0l.9-.3A18 18 0 0112 3c3 0 5.5 1 8 1.5V15c-2.5-.5-5-1.5-8-1.5a18 18 0 00-8.1 1.8L3 15.5" />
    </svg>
  ),
  phone: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.125 1.125 0 00-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  upload: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" />
    </svg>
  ),
  chart: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  // Distinct keys from the existing 'users'/'user-group' icons (which are mapped
  // in NAV_I18N_KEY to Members/Users translations) so callcenter labels aren't
  // accidentally translated to the wrong text. Same glyphs, different key.
  contacts: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  group: (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  'phone-queue': (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.125 1.125 0 00-.852-1.091l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.143-7.143 1.125 1.125 0 01.38-1.21l1.293-.97a1.125 1.125 0 00.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
}

const NAV_I18N_KEY = {
  home: 'nav.dashboard',
  users: 'nav.members',
  document: 'nav.forms',
  building: 'nav.committees',
  flag: 'nav.bodies',
  clipboard: 'nav.functions',
  'user-group': 'nav.users',
  'user-circle': 'nav.profile',
  phone: 'nav.campaigns',
  upload: 'nav.import',
  contacts: 'nav.contacts',
  group: 'nav.pools',
  'phone-queue': 'nav.queue',
  chart: 'nav.reports',
}

const NAV_SECTION_I18N_KEY = {
  main: 'nav.mainMenu',
  callcenter: 'nav.callcenter',
  account: 'nav.account',
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
  const callcenterItems = items.filter((i) => i.section === 'callcenter')
  const accountItems = items.filter((i) => i.section === 'account')
  const showLabels = isExpanded || isHovered || isMobileOpen

  return (
    <aside
      className={`fixed top-0 left-0 z-[99999] flex h-screen flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 transition-all duration-300 ease-in-out
        ${isExpanded || isHovered ? 'w-[240px]' : 'w-[90px]'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo row */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-800 px-4 ${
          !showLabels ? 'justify-center' : 'justify-between'
        }`}
      >
        {showLabels ? (
          <>
            <div className="flex items-center gap-2.5">
              <img src="/assets/marcipanoLogo.png" alt="Logo" className="h-10 w-auto object-contain" />
              <span className="text-lg font-bold tracking-wide text-brand-600 dark:text-brand-400">Marcipano</span>
            </div>
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
          <img src="/assets/marcipanoLogo.png" alt="Logo" className="size-10 object-contain" />
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
        {callcenterItems.length > 0 && (
          <div className="mb-6">
            {showLabels && (
              <h2 className="mb-3 px-3 text-theme-xs font-medium uppercase text-gray-400">
                {t(NAV_SECTION_I18N_KEY.callcenter)}
              </h2>
            )}
            <ul className="flex flex-col gap-1">
              {callcenterItems.map((item) => (
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
