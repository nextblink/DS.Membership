import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function computePercentage(row) {
  if (typeof row.percentage === 'number') return row.percentage
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 100
  return 0
}

function barColor(pct) {
  if (pct >= 70) return '#4ABEA0'
  if (pct >= 40) return '#2E6BAD'
  return '#f79009'
}

function PercentBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = barColor(pct)
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="w-12 text-right text-theme-xs font-semibold" style={{ color }}>
        {pct.toFixed(1)}%
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
    { key: 'percentage',  label: t('orgTable.percentage'), numeric: true  },
  ]
  const [sortKey, setSortKey] = useState('memberCount')
  const [sortDir, setSortDir] = useState('desc')

  const normalized = useMemo(
    () =>
      (rows || []).map((r) => ({
        orgUnitId:   r.orgUnitId,
        name:        r.name,
        memberCount: r.memberCount ?? 0,
        voterCount:  r.voterCount  ?? 0,
        percentage:  computePercentage(r),
      })),
    [rows],
  )

  const sorted = useMemo(() => {
    const arr = [...normalized]
    const col = columns.find((c) => c.key === sortKey)
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      const cmp = col?.numeric
        ? (av ?? 0) - (bv ?? 0)
        : String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [normalized, sortKey, sortDir])

  function toggleSort(key) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir(columns.find((c) => c.key === key)?.numeric ? 'desc' : 'asc') }
  }

  function sortIndicator(key) {
    if (key !== sortKey) return <span className="ml-1 text-gray-300 dark:text-gray-600">⇅</span>
    return <span className="ml-1 text-brand-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden h-full">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h4 className="text-base font-semibold text-brand-500 dark:text-brand-400">
          {t('orgTable.title')}
        </h4>
        <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
          {sorted.length} {t('orgTable.units')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
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
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-theme-sm text-gray-400 dark:text-gray-500">
                  {t('orgTable.noData')}
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
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
                    <PercentBar pct={row.percentage} />
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
