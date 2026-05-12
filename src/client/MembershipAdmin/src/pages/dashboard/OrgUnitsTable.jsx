// Sortable table of org units with member/voter counts and membership %.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

function computePercentage(row) {
  if (typeof row.percentage === 'number') return row.percentage
  if (row.voterCount > 0) return (row.memberCount / row.voterCount) * 100
  return 0
}

export default function OrgUnitsTable({ rows }) {
  const { t } = useTranslation('dashboard')
  const columns = [
    { key: 'name', label: t('orgTable.orgUnit'), numeric: false },
    { key: 'memberCount', label: t('orgTable.members'), numeric: true },
    { key: 'voterCount', label: t('orgTable.voters'), numeric: true },
    { key: 'percentage', label: t('orgTable.percentage'), numeric: true },
  ]
  const [sortKey, setSortKey] = useState('memberCount')
  const [sortDir, setSortDir] = useState('desc')

  const normalized = useMemo(
    () =>
      (rows || []).map((r) => ({
        orgUnitId: r.orgUnitId,
        name: r.name,
        memberCount: r.memberCount ?? 0,
        voterCount: r.voterCount ?? 0,
        percentage: computePercentage(r),
      })),
    [rows],
  )

  const sorted = useMemo(() => {
    const arr = [...normalized]
    const col = columns.find((c) => c.key === sortKey)
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      let cmp
      if (col?.numeric) cmp = (av ?? 0) - (bv ?? 0)
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [normalized, sortKey, sortDir])

  function toggleSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(columns.find((c) => c.key === key)?.numeric ? 'desc' : 'asc')
    }
  }

  function sortIndicator(key) {
    if (key !== sortKey) return <span className="ml-1 text-bodydark2">⇅</span>
    return (
      <span className="ml-1 text-primary">{sortDir === 'asc' ? '▲' : '▼'}</span>
    )
  }

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
        {t('orgTable.title')}
      </h4>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`min-w-[80px] cursor-pointer select-none px-4 py-4 font-medium text-black dark:text-white ${
                    c.numeric ? 'text-right' : ''
                  }`}
                  onClick={() => toggleSort(c.key)}
                  aria-sort={
                    sortKey === c.key
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  {c.label}
                  {sortIndicator(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-sm text-body"
                >
                  {t('orgTable.noData')}
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr
                  key={row.orgUnitId}
                  className="border-b border-stroke dark:border-strokedark"
                >
                  <td className="px-4 py-4 text-sm text-black dark:text-white">
                    {row.name}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-black dark:text-white">
                    {row.memberCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-black dark:text-white">
                    {row.voterCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-primary">
                    {row.percentage.toFixed(2)}%
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
