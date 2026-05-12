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
