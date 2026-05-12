import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/members', label: 'Members' },
  { to: '/forms', label: 'Forms' },
  { to: '/org-units', label: 'Org Units' },
  { to: '/functions', label: 'Functions' },
  { to: '/users', label: 'Users' },
  { to: '/profile', label: 'Profile' },
]

export default function Sidebar({ open, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 flex-col overflow-y-hidden bg-boxdark text-bodydark1 duration-300 ease-linear lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <a href="/" className="text-xl font-semibold text-white">
          Membership
        </a>
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
        <nav className="mt-2 px-4 py-4 lg:px-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bodydark2">
            Menu
          </h3>
          <ul className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-md px-4 py-2 text-sm font-medium duration-300 ease-in-out ${
                      isActive
                        ? 'bg-graydark text-white'
                        : 'text-bodydark1 hover:bg-graydark hover:text-white'
                    }`
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-60" aria-hidden="true" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
