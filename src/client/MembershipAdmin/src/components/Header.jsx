import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import auth from '../framework/auth'

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate()
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

  const handleLogout = () => {
    auth.logout()
    setMenuOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 flex w-full bg-white drop-shadow-sm">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-sm md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4 lg:hidden">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="z-50 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-black">Admin Panel</h1>
        </div>

        <div className="relative flex items-center gap-3 2xsm:gap-7" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-3 rounded-sm px-2 py-1 hover:bg-whiten focus:outline-none"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium text-black">{email}</span>
              {role && <span className="block text-xs text-body">{role}</span>}
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {initial}
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-40 w-56 rounded-sm border border-stroke bg-white py-2 shadow-default"
            >
              <div className="border-b border-stroke px-4 py-2">
                <div className="text-sm font-medium text-black">{email}</div>
                {role && <div className="text-xs text-body">{role}</div>}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-black hover:bg-whiten"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
