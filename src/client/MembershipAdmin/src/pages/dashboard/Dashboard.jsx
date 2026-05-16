import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import StatsCard from './StatsCard'
import OrgUnitsTable from './OrgUnitsTable'
import FormsStatusDonut from './FormsStatusDonut'

function computePromille(row) {
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 1000
  if (typeof row.percentage === 'number') return row.percentage * 10
  return 0
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm px-7 py-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-20 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="mt-2 h-3 w-28 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm h-72 animate-pulse" />
        <div className="xl:col-span-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm h-72 animate-pulse" />
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  const { t } = useTranslation(['dashboard', 'common'])
  return (
    <div className="rounded-xl border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-500/20">
        <svg className="h-6 w-6 text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="mb-4 text-theme-sm text-error-600 dark:text-error-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2 text-theme-sm font-medium text-white"
      >
        {t('common:button.retry')}
      </button>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get('/api/dashboard/stats')
      .then((res) => { if (!cancelled) setStats(res.data) })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || err?.message || t('error.loadFailed'))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />

  const totalMembers    = stats?.totalMembers ?? 0
  const membersByOrgUnit = stats?.membersByOrgUnit ?? []
  const formsByStatus   = stats?.formsByStatus ?? {}
  const pendingForms    = formsByStatus.pending  ?? 0
  const verifiedForms   = formsByStatus.verified ?? 0
  const orgUnitCount    = membersByOrgUnit.length

  const avgMembership = orgUnitCount > 0
    ? membersByOrgUnit.reduce((s, r) => s + computePromille(r), 0) / orgUnitCount
    : 0

  const iconProps = (color) => ({
    className: `h-5 w-5`,
    style: { color },
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  })

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          delay="0ms"
          accent="#2E6BAD"
          label={t('stats.totalMembers')}
          value={totalMembers.toLocaleString()}
          to="/members"
          icon={
            <svg {...iconProps('#2E6BAD')}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatsCard
          delay="80ms"
          accent="#4ABEA0"
          label={t('stats.verifiedForms')}
          value={verifiedForms.toLocaleString()}
          to="/forms?status=Verified"
          icon={
            <svg {...iconProps('#4ABEA0')}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          delay="160ms"
          accent="#f79009"
          label={t('stats.pendingForms')}
          value={pendingForms.toLocaleString()}
          sublabel={pendingForms > 0 ? t('stats.pendingNote') : undefined}
          to="/forms?status=Pending"
          icon={
            <svg {...iconProps('#f79009')}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          delay="240ms"
          accent="#3E8DC4"
          label={t('stats.avgMembership')}
          value={`${avgMembership.toFixed(2)}‰`}
          sublabel={t('stats.orgUnitsCount', { count: orgUnitCount })}
          icon={
            <svg {...iconProps('#3E8DC4')}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Main content */}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <OrgUnitsTable rows={membersByOrgUnit} />
        </div>
        <div className="xl:col-span-5">
          <FormsStatusDonut formsByStatus={formsByStatus} />
        </div>
      </div>
    </div>
  )
}
