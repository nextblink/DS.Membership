import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function computePromille(row) {
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 1000
  // API may return percentage (0-100); convert to promille
  if (typeof row.percentage === 'number') return row.percentage * 10
  return 0
}

function barColor(pm) {
  if (pm >= 1)   return '#4ABEA0' // green
  if (pm >= 0.8) return '#f79009' // orange
  return '#f04438'                 // red
}

function PromilleBar({ pm }) {
  // Scale bar: treat 2‰ as 100% full for visual purposes
  const clamped = Math.min(100, (pm / 2) * 100)
  const color = barColor(pm)
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="w-14 text-right text-theme-xs font-semibold tabular-nums" style={{ color }}>
        {pm.toFixed(2)}‰
      </span>
    </div>
  )
}

export default function OrgUnitsTable({ rows }) {
  const { t } = useTranslation('dashboard')
  const columns = [
    { key: 'name',        label: t('orgTable.orgUnit'),    numeric: false },
    { key: 'memberCount', label: t('orgTable.members'),    numeric: true  },
    { key: 'voterCount',  label: t('orgTable.voters'),     numeric: true  },
    { key: 'promille',  label: t('orgTable.promille'), numeric: true  },
  ]
  const [sortKey, setSortKey] = useState('promille')
  const [sortDir, setSortDir] = useState('desc')
  const [search, setSearch] = useState('')

  const normalized = useMemo(
    () =>
      (rows || []).map((r) => ({
        orgUnitId:   r.orgUnitId,
        name:        r.name,
        memberCount: r.memberCount ?? 0,
        voterCount:  r.voterCount  ?? 0,
        promille:    computePromille(r),
      })),
    [rows],
  )

  // When searching, filter the FULL list by name; otherwise show all sorted by promille
  const displayed = useMemo(() => {
    const trimmed = search.trim().toLowerCase()
    const base = trimmed
      ? normalized.filter((r) => r.name.toLowerCase().includes(trimmed))
      : normalized

    const col = columns.find((c) => c.key === sortKey)
    const arr = [...base]
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = col?.numeric
        ? (av ?? 0) - (bv ?? 0)
        : String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [normalized, search, sortKey, sortDir])

  function toggleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(columns.find((c) => c.key === key)?.numeric ? 'desc' : 'asc') }
  }

  function sortIndicator(key) {
    if (key !== sortKey) return <span className="ml-1 text-gray-300 dark:text-gray-600">⇅</span>
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  const isSearching = search.trim().length > 0

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden flex flex-col h-full max-h-[550px]">
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-6 py-4 shrink-0">
        <h4 className="shrink-0 text-base font-semibold text-brand-500 dark:text-brand-400">
          {t('orgTable.title')}
        </h4>

        {/* Search box */}
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('orgTable.searchPlaceholder', { defaultValue: 'Search org units…' })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-1.5 pl-9 pr-8 text-theme-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <span className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
          {displayed.length} {t('orgTable.units')}
        </span>
      </div>

      <div className="overflow-x-auto flex-1 overflow-y-auto">
        <table className="w-full table-auto">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/50">
            <tr className="text-left">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`cursor-pointer select-none px-4 py-3 text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors ${c.numeric ? 'text-right' : ''}`}
                  onClick={() => toggleSort(c.key)}
                  aria-sort={sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {c.label}{sortIndicator(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-theme-sm text-gray-400 dark:text-gray-500">
                  {t('orgTable.noData')}
                </td>
              </tr>
            ) : (
              displayed.map((row, i) => (
                <tr
                  key={row.orgUnitId}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-brand-50/40 dark:hover:bg-brand-500/[0.04] transition-colors"
                >
                  <td className="px-4 py-3 text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10">
                        {i + 1}
                      </span>
                      {row.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-theme-sm text-gray-700 dark:text-gray-300 tabular-nums">
                    {row.memberCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-theme-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {row.voterCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <PromilleBar pm={row.promille} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
