import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../framework/auth'
import { NAV_ITEMS } from '../config'

const ICONS = {
  home: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  users: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  document: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  building: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clipboard: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  'user-group': (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  'user-circle': (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

const NAV_KEY = {
  home: 'nav.dashboard',
  users: 'nav.members',
  document: 'nav.forms',
  building: 'nav.orgUnits',
  clipboard: 'nav.functions',
  'user-group': 'nav.users',
  'user-circle': 'nav.profile',
}

function NavItem({ item }) {
  const { t } = useTranslation('common')
  return (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.to === '/dashboard'}
        className={({ isActive }) =>
          `group flex items-center gap-2.5 rounded-md px-4 py-2 text-sm font-medium duration-300 ease-in-out ${
            isActive
              ? 'bg-graydark text-white'
              : 'text-bodydark1 hover:bg-graydark hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className={`flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-75'}`} aria-hidden="true">
              {ICONS[item.iconName]}
            </span>
            {t(NAV_KEY[item.iconName] || item.label)}
          </>
        )}
      </NavLink>
    </li>
  )
}

export default function Sidebar({ open, onClose }) {
  const { t } = useTranslation('common')
  const role = auth.getRole()
  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.length === 0 || (role && item.roles.includes(role)),
  )

  const mainItems = items.filter((i) => i.section === 'main')
  const accountItems = items.filter((i) => i.section === 'account')

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col overflow-y-hidden bg-boxdark text-bodydark1 duration-300 ease-linear lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/dashboard" className="text-xl font-semibold text-white">
          Membership
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="block lg:hidden text-bodydark2 hover:text-white"
          aria-label="Close sidebar"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mt-2 px-4 py-4 lg:px-6" data-testid="sidebar-nav">
          {mainItems.length > 0 && (
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bodydark2">
                {t('nav.mainMenu')}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {mainItems.map((item) => <NavItem key={item.to} item={item} />)}
              </ul>
            </div>
          )}
          {accountItems.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bodydark2">
                {t('nav.account')}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {accountItems.map((item) => <NavItem key={item.to} item={item} />)}
              </ul>
            </div>
          )}
        </nav>
      </div>
    </aside>
  )
}
