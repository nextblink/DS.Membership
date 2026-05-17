import { useTranslation } from 'react-i18next'

export default function FormStatsCard({ verifiedCount, pendingCount }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const total = verifiedCount + pendingCount

  return (
    <div className="db-card relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm" style={{ animationDelay: '160ms' }}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: '#f79009' }} />
      <div className="px-5 py-5 pl-7">
        <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {total.toLocaleString()}
        </div>
        <div className="mt-0.5 text-theme-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('stats.forms')}
        </div>
        <div className="mt-3 flex gap-6">
          <a href="/forms?status=Verified" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">{verifiedCount.toLocaleString()}</span>
          </a>
          <a href="/forms?status=Pending" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <svg className="h-4 w-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <span className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">{pendingCount.toLocaleString()}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
