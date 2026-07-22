// Contact list: filter by campaign/city/final status/outcome/search, paginated table.
// Mirrors the card/table + pagination markup from pages/callcenter/PoolList.jsx and
// pages/members/MembersList.jsx (pagination pattern).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'
import { CALL_OUTCOME, toEnumKey } from '../../services/callScript'

// Enum values mirror the backend Enums.cs ordinals (ContactFinalStatus).
const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

const PAGE_SIZE = 20

export default function ContactList() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', city: '', finalStatus: '', lastOutcome: '', search: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // The API serializes enums as their string member name (JsonStringEnumConverter in
  // Program.cs), so lastOutcome/finalStatus arrive as e.g. "NoAnswer", not a numeric
  // ordinal. Translate the value via enums.json, falling back to the raw value.
  const outcomeLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return value in CALL_OUTCOME ? t(`enums:callOutcome.${toEnumKey(value)}`, value) : String(value)
  }

  const finalStatusLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return value in FINAL_STATUS ? t(`enums:contactFinalStatus.${toEnumKey(value)}`, value) : String(value)
  }

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
        setError(err?.response?.data?.message || t('callcenter:contacts.loadFailed'))
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

  const totalPages = data.totalPages || 1

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:contacts.title')}</h1>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.campaign')}</label>
            <select className={inputClass} value={filters.campaignId} onChange={set('campaignId')}>
              <option value="">{t('callcenter:contacts.filters.allCampaigns')}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.city')}</label>
            <input
              className={inputClass}
              value={filters.city}
              onChange={set('city')}
              placeholder={t('callcenter:contacts.filters.cityPlaceholder')}
            />
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.status')}</label>
            <select className={inputClass} value={filters.finalStatus} onChange={set('finalStatus')}>
              <option value="">{t('callcenter:contacts.filters.allStatuses')}</option>
              {Object.entries(FINAL_STATUS).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:contactFinalStatus.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.outcome')}</label>
            <select className={inputClass} value={filters.lastOutcome} onChange={set('lastOutcome')}>
              <option value="">{t('callcenter:contacts.filters.allOutcomes')}</option>
              {Object.entries(CALL_OUTCOME).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:callOutcome.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.search')}</label>
            <input
              className={inputClass}
              value={filters.search}
              onChange={set('search')}
              placeholder={t('callcenter:contacts.filters.searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">{t('callcenter:contacts.columns.name')}</th>
              <th className="px-4 py-3">{t('callcenter:contacts.columns.phone')}</th>
              <th className="px-4 py-3">{t('callcenter:contacts.columns.municipality')}</th>
              <th className="px-4 py-3 w-24 whitespace-nowrap">{t('callcenter:contacts.columns.tries')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('callcenter:contacts.columns.outcome')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('callcenter:contacts.columns.status')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('callcenter:contacts.columns.previousResult')}</th>
              <th className="px-4 py-3 w-28 whitespace-nowrap">{t('callcenter:contacts.columns.link')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('common:state.loading')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('callcenter:contacts.empty')}
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
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{c.municipalityName ?? c.city ?? '-'}</td>
                  <td className="px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.attemptCount}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {outcomeLabel(c.lastOutcome)}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {finalStatusLabel(c.finalStatus)}
                  </td>
                  <td className="px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">
                    {c.importedOutcome ?? '-'}
                  </td>
                  <td className="px-4 py-3 w-28 whitespace-nowrap text-theme-sm">
                    {c.convertedMemberId ? (
                      <span className="rounded-full bg-success-50 dark:bg-success-500/10 px-2 py-0.5 text-theme-xs font-medium text-success-600 dark:text-success-400">
                        {t('callcenter:contacts.enrolled')}
                      </span>
                    ) : c.matchedMemberId ? (
                      <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                        {t('callcenter:contacts.linked')}
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
          {t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.prev')}
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => setPage(data.page + 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
