import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { toEnumKey } from '../../services/callScript'
import DashboardCard from './DashboardCard'

const PANEL =
  'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm p-5'

export default function OperatorDashboard() {
  const { t } = useTranslation(['dashboard', 'enums', 'common'])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/call-center/my-stats')
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || err?.message || t('dashboard:error.loadFailed'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${PANEL} h-24 animate-pulse`} />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-red-500">{error}</p>

  const outcomes = stats?.outcomeBreakdown ?? []
  const recent = stats?.recentCalls ?? []
  const queueTotal = stats?.queueTotal ?? 0
  const queueResolved = stats?.queueResolved ?? 0
  const queuePct = queueTotal > 0 ? Math.round((queueResolved / queueTotal) * 100) : 0
  const outcomeMax = outcomes.reduce((m, o) => Math.max(m, o.count), 0)

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
        {t('dashboard:operator.title')}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard
          accent="#2E6BAD"
          delay="0ms"
          stats={[{ value: stats?.callsToday ?? 0, label: t('dashboard:operator.callsToday') }]}
        />
        <DashboardCard
          accent="#7C3AED"
          delay="60ms"
          stats={[{ value: stats?.callsLast7Days ?? 0, label: t('dashboard:operator.callsLast7Days') }]}
        />
        <DashboardCard
          accent="#059669"
          delay="120ms"
          stats={[{ value: stats?.callsTotal ?? 0, label: t('dashboard:operator.callsTotal') }]}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Queue progress */}
        <div className={`${PANEL} xl:col-span-5`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('dashboard:operator.queueTitle')}
          </h2>
          {queueTotal === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard:operator.queueEmpty')}</p>
          ) : (
            <>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {t('dashboard:operator.queueProgress', { resolved: queueResolved, total: queueTotal })}
                </span>
                <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">{queuePct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${queuePct}%` }} />
              </div>
            </>
          )}
        </div>

        {/* Outcome breakdown */}
        <div className={`${PANEL} xl:col-span-7`}>
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('dashboard:operator.outcomeTitle')}
          </h2>
          {outcomes.length === 0 ? (
            <p className="text-sm text-gray-500">{t('dashboard:operator.outcomeEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {outcomes.map((o) => (
                <li key={o.outcome} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-xs text-gray-600 dark:text-gray-300">
                    {t(`enums:callOutcome.${toEnumKey(o.outcome)}`, o.outcome)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: outcomeMax > 0 ? `${(o.count / outcomeMax) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-gray-900 dark:text-white">
                    {o.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent calls */}
      <div className={`${PANEL} mt-5`}>
        <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t('dashboard:operator.recentTitle')}
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">{t('dashboard:operator.recentEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-gray-400">
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colContact')}</th>
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colPhone')}</th>
                  <th className="pb-2 pr-4 font-semibold">{t('dashboard:operator.colWhen')}</th>
                  <th className="pb-2 font-semibold">{t('dashboard:operator.colOutcome')}</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-200">
                {recent.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4">{r.contactName}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.phoneNumber}</td>
                    <td className="py-2 pr-4 tabular-nums">{new Date(r.calledAt).toLocaleString('sr-RS')}</td>
                    <td className="py-2">{t(`enums:callOutcome.${toEnumKey(r.outcome)}`, r.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
