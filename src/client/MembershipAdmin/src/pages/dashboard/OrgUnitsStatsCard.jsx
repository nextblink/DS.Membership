import { useTranslation } from 'react-i18next'

export default function OrgUnitsStatsCard({ totalOrgUnits, nonTrustworthyCount, nonTrustworthyPercentage }) {
  const { t } = useTranslation(['dashboard', 'common'])

  return (
    <div className="db-card relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm" style={{ animationDelay: '80ms' }}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: '#8b5cf6' }} />
      <div className="px-5 py-5 pl-7">
        <div className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {totalOrgUnits.toLocaleString()}
        </div>
        <div className="mt-0.5 text-theme-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('stats.orgUnits')}
        </div>
        <div className="mt-3 flex gap-6">
          <div className="flex items-center gap-2">
            <span className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">
              {nonTrustworthyCount.toLocaleString()} ({nonTrustworthyPercentage.toFixed(1)}%)
            </span>
            <span className="text-theme-xs text-gray-500 dark:text-gray-500">
              {t('stats.notTrusted')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
