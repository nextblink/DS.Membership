import { useTranslation } from 'react-i18next'

export default function FormStatsCard({ verifiedCount, pendingCount }) {
  const { t } = useTranslation(['dashboard', 'common'])

  const iconProps = (color) => ({
    className: `h-5 w-5`,
    style: { color },
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  })

  return (
    <div className="db-card relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm" style={{ animationDelay: '160ms' }}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: '#f79009' }} />
      <div className="px-5 py-5 pl-7">
        <div className="flex gap-8">
          <div>
            <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {verifiedCount.toLocaleString()}
            </div>
            <div className="mt-0.5 text-theme-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('stats.verifiedForms')}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              {pendingCount.toLocaleString()}
            </div>
            <div className="mt-0.5 text-theme-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('stats.pendingForms')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
