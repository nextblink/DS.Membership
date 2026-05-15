const css = `
  @keyframes db-rise {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .db-card { animation: db-rise 0.45s ease both; }
`

export default function StatsCard({ label, value, sublabel, icon, accent = '#2e6bad', delay = '0s' }) {
  return (
    <>
      <style>{css}</style>
      <div
        className="db-card relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm"
        style={{ animationDelay: delay }}
      >
        {/* Left accent stripe */}
        <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />

        <div className="flex items-center justify-between px-5 py-5 pl-7">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {value}
            </div>
            <div className="mt-0.5 text-theme-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {label}
            </div>
            {sublabel && (
              <div className="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">{sublabel}</div>
            )}
          </div>
          <div
            className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${accent}18` }}
          >
            {icon}
          </div>
        </div>
      </div>
    </>
  )
}
