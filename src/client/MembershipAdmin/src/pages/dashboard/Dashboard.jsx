// Dashboard page: total members, sortable org-unit table, and forms-status donut.
import { useEffect, useState } from 'react'
import api from '../../framework/api'
import StatsCard from './StatsCard'
import OrgUnitsTable from './OrgUnitsTable'
import FormsStatusDonut from './FormsStatusDonut'

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-gray-2 dark:bg-meta-4 ${className}`}
    />
  )
}

function LoadingState() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark"
          >
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="mt-4 h-8 w-24" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-7">
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <Skeleton className="h-6 w-48" />
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-12 xl:col-span-5">
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <Skeleton className="h-6 w-48" />
            <div className="mt-6 flex justify-center">
              <Skeleton className="h-56 w-56 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-sm border border-danger/30 bg-danger/5 p-6 text-center shadow-default">
      <h3 className="mb-2 text-lg font-semibold text-danger">
        Failed to load dashboard
      </h3>
      <p className="mb-4 text-sm text-body">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-center font-medium text-white hover:bg-opacity-90"
      >
        Retry
      </button>
    </div>
  )
}

export default function Dashboard() {
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
      .then((res) => {
        if (cancelled) return
        setStats(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load dashboard stats.'
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  if (loading) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          Dashboard
        </h2>
        <LoadingState />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-black dark:text-white">
          Dashboard
        </h2>
        <ErrorState
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    )
  }

  const totalMembers = stats?.totalMembers ?? 0
  const membersByOrgUnit = stats?.membersByOrgUnit ?? []
  const formsByStatus = stats?.formsByStatus ?? {
    pending: 0,
    verified: 0,
    rejected: 0,
  }
  const totalForms =
    (formsByStatus.pending ?? 0) +
    (formsByStatus.verified ?? 0) +
    (formsByStatus.rejected ?? 0)
  const orgUnitCount = membersByOrgUnit.length

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold text-black dark:text-white">
        Dashboard
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4 2xl:gap-7.5">
        <StatsCard label="Total Members" value={totalMembers.toLocaleString()} />
        <StatsCard
          label="Verified Forms"
          value={(formsByStatus.verified ?? 0).toLocaleString()}
        />
        <StatsCard
          label="Pending Forms"
          value={(formsByStatus.pending ?? 0).toLocaleString()}
        />
        <StatsCard
          label="Org Units"
          value={orgUnitCount.toLocaleString()}
          sublabel={`${totalForms.toLocaleString()} forms total`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-12 2xl:gap-7.5">
        <div className="col-span-12 xl:col-span-7">
          <OrgUnitsTable rows={membersByOrgUnit} />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <FormsStatusDonut formsByStatus={formsByStatus} />
        </div>
      </div>
    </div>
  )
}
