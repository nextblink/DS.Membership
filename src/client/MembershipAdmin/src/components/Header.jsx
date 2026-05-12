export default function Header({ onToggleSidebar }) {
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

        <div className="flex items-center gap-3 2xsm:gap-7">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            A
          </div>
        </div>
      </div>
    </header>
  )
}
