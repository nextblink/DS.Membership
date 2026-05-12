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
