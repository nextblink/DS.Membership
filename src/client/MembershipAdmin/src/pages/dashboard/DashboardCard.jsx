import { Link } from 'react-router-dom'

const css = `
  @keyframes db-rise {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .db-card {
    animation: db-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .db-card-link:hover .db-card-inner {
    background: rgba(0,0,0,0.015);
  }
  .dark .db-card-link:hover .db-card-inner {
    background: rgba(255,255,255,0.03);
  }
`

/**
 * Unified stat card used across the dashboard top row.
 *
 * Props:
 *   accent   – left stripe + icon bg color
 *   delay    – animation delay string
 *   to       – react-router link target (makes whole card clickable)
 *   stats    – array of { value, label } objects (1 or 2 items)
 *   right    – optional right-side slot (e.g. pie chart)
 *   icon     – optional icon element shown when single stat and no right slot
 */
export default function DashboardCard({ accent = '#2E6BAD', delay = '0ms', to, stats = [], right, icon }) {
  return (
    <>
      <style>{css}</style>
      <Wrapper to={to} delay={delay}>
        {/* Left accent stripe */}
        <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl" style={{ background: accent }} />

        {/* Decorative oversized icon — top-right overflow */}
        {icon && (
          <div
            className="pointer-events-none absolute -top-3 -right-3 flex h-20 w-20 items-center justify-center"
            style={{ color: accent, opacity: 0.12 }}
            aria-hidden
          >
            {/* Clone the icon at large size */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-full w-full">
              {icon.props.children}
            </svg>
          </div>
        )}

        <div className="db-card-inner flex h-full items-center justify-between gap-4 px-6 py-5 pl-8 rounded-xl transition-colors duration-150">
          {/* Left: stats */}
          <div className={`flex min-w-0 ${stats.length > 1 ? 'gap-8' : 'flex-col'}`}>
            {stats.map((s, i) => (
              <StatBlock key={i} value={s.value} label={s.label} primary={i === 0 && stats.length === 1} accent={accent} />
            ))}
          </div>

          {/* Right: pie slot */}
          {right && <div className="shrink-0">{right}</div>}
        </div>
      </Wrapper>
    </>
  )
}

function StatBlock({ value, label, primary, accent }) {
  return (
    <div className="min-w-0">
      <div
        className={`font-bold tabular-nums tracking-tight text-gray-900 dark:text-white ${primary ? 'text-2xl' : 'text-xl'}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500 truncate">
        {label}
      </div>
    </div>
  )
}

function Wrapper({ to, delay, children }) {
  const base =
    'db-card db-card-link relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm'

  if (to) {
    return (
      <Link to={to} className={base} style={{ animationDelay: delay }}>
        {children}
      </Link>
    )
  }
  return (
    <div className={base} style={{ animationDelay: delay }}>
      {children}
    </div>
  )
}
