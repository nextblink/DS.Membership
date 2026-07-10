// Contact list: filter by campaign/city/final status/outcome/search, paginated table.
// Mirrors the card/table + pagination markup from pages/callcenter/PoolList.jsx and
// pages/members/MembersList.jsx (pagination pattern).
import { useEffect, useMemo, useState } from 'react'
import callCenterApi from '../../services/callCenterApi'
import { CALL_OUTCOME } from '../../services/callScript'

// Enum values mirror the backend Enums.cs ordinals (ContactFinalStatus).
const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

const PAGE_SIZE = 20

// The API serializes enums as their string member name (JsonStringEnumConverter in
// Program.cs), so lastOutcome/finalStatus arrive as e.g. "NoAnswer", not a numeric
// ordinal. Validate the value against the known keys and render it as-is.
function outcomeLabel(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value in CALL_OUTCOME ? value : String(value)
}

function finalStatusLabel(value) {
  if (value === null || value === undefined || value === '') return '-'
  return value in FINAL_STATUS ? value : String(value)
}

export default function ContactList() {
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', city: '', finalStatus: '', lastOutcome: '', search: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))
  }, [])

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = { page, pageSize: PAGE_SIZE }
    if (filters.campaignId) params.campaignId = filters.campaignId
    if (filters.city) params.city = filters.city
    if (filters.finalStatus !== '') params.finalStatus = filters.finalStatus
    if (filters.lastOutcome !== '') params.lastOutcome = filters.lastOutcome
    if (filters.search) params.search = filters.search

    callCenterApi
      .listContacts(params)
      .then((d) => {
        if (cancelled) return
        setData({
          items: d.items ?? [],
          totalCount: d.totalCount ?? 0,
          page: d.page ?? 1,
          pageSize: d.pageSize ?? PAGE_SIZE,
          totalPages: d.totalPages ?? 1,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Учитавање није успело.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterKey])

  const set = (k) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  }

  const campaignName = (id) => campaigns.find((c) => c.id === id)?.name || `#${id}`

  const totalPages = data.totalPages || 1

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">Контакти</h1>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>Кампања</label>
            <select className={inputClass} value={filters.campaignId} onChange={set('campaignId')}>
              <option value="">Све кампање</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Место</label>
            <input className={inputClass} value={filters.city} onChange={set('city')} placeholder="Место" />
          </div>
          <div>
            <label className={labelClass}>Статус</label>
            <select className={inputClass} value={filters.finalStatus} onChange={set('finalStatus')}>
              <option value="">Сви статуси</option>
              {Object.entries(FINAL_STATUS).map(([k, v]) => (
                <option key={v} value={v}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Исход</label>
            <select className={inputClass} value={filters.lastOutcome} onChange={set('lastOutcome')}>
              <option value="">Сви исходи</option>
              {Object.entries(CALL_OUTCOME).map(([k, v]) => (
                <option key={v} value={v}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Претрага</label>
            <input className={inputClass} value={filters.search} onChange={set('search')} placeholder="Име, телефон..." />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Име</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Место</th>
              <th className="px-4 py-3 w-24 whitespace-nowrap">Покушаја</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">Исход</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">Статус</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap">Веза</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Учитавање...
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  Нема контаката.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.items.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{c.phoneNumber}</td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{c.city ?? '-'}</td>
                  <td className="px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.attemptCount}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {outcomeLabel(c.lastOutcome)}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {finalStatusLabel(c.finalStatus)}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm">
                    {c.convertedMemberId ? (
                      <span className="rounded-full bg-success-50 dark:bg-success-500/10 px-2 py-0.5 text-theme-xs font-medium text-success-600 dark:text-success-400">
                        Учлањен
                      </span>
                    ) : c.matchedMemberId ? (
                      <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                        Повезан
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
          Укупно {data.totalCount} · страна {data.page} / {totalPages}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Претходна
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => setPage(data.page + 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Следећа
          </button>
        </div>
      </div>
    </div>
  )
}
