// Read-only reports dashboard: filter bar (campaign/date range) + scalar metric cards +
// engagement-area/top-suggestion tables + client-side CSV export.
// Styling mirrors pages/callcenter/ContactList.jsx and CampaignForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'
import { ENGAGEMENT_AREA, toEnumKey } from '../../services/callScript'
import { formatDateTime } from '../../services/dateUtils'

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

// Shared by the report query and its export so the downloaded file always matches the screen.
function queryParams(filters) {
  const params = {}
  if (filters.campaignId) params.campaignId = filters.campaignId
  if (filters.poolId) params.poolId = filters.poolId
  if (filters.fromDate) params.fromDate = filters.fromDate
  if (filters.toDate) params.toDate = filters.toDate
  return params
}

// CallCenterReportDto field names (camelCase JSON; JsonStringEnumConverter doesn't apply
// here since these are plain ints). Label keys resolve against callcenter:reports.cards.
const CARD_KEYS = [
  ['contacted', 'contacted'],
  ['invalidContacts', 'invalidContacts'],
  ['activeMembers', 'activeMembers'],
  ['inactiveMembers', 'inactiveMembers'],
  ['sympathizers', 'sympathizers'],
  ['noCooperation', 'noCooperation'],
  ['interestedInActivating', 'interestedInActivating'],
]

export default function CallCenterReports() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const [campaigns, setCampaigns] = useState([])
  const [pools, setPools] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', poolId: '', fromDate: '', toDate: '' })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)

  const CARDS = CARD_KEYS.map(([labelKey, key]) => [t(`callcenter:reports.cards.${labelKey}`), key])

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))
  }, [])

  // Pools belong to a campaign, so the list reloads whenever the campaign changes.
  useEffect(() => {
    callCenterApi
      .listPools(filters.campaignId || undefined)
      .then((d) => setPools(Array.isArray(d) ? d : d?.items ?? []))
      .catch(() => setPools([]))
  }, [filters.campaignId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = queryParams(filters)

    callCenterApi
      .getReport(params)
      .then((d) => {
        if (cancelled) return
        setReport(d)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || t('callcenter:reports.loadFailed'))
        setReport(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.campaignId, filters.poolId, filters.fromDate, filters.toDate])

  const set = (k) => (e) =>
    setFilters((f) => ({
      ...f,
      [k]: e.target.value,
      // A pool belongs to one campaign, so a stale pool id would silently zero out the report.
      ...(k === 'campaignId' ? { poolId: '' } : null),
    }))

  // The API sends the area as its enum member name ("MunicipalBoard"), same as everywhere
  // else in the client — translate it through enums.json rather than showing the raw name.
  const areaLabel = (value) => {
    if (value === null || value === undefined || value === '') return '-'
    return value in ENGAGEMENT_AREA ? t(`enums:engagementArea.${toEnumKey(value)}`, value) : String(value)
  }

  // Built server-side: the file then carries every suggestion behind the current filters,
  // not just the capped list this page renders.
  const exportCsv = async () => {
    setExporting(true)
    setError(null)
    try {
      const blob = await callCenterApi.exportReport(queryParams(filters))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'izvestaj-kol-centar.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('callcenter:reports.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:reports.title')}</h1>
        <button
          type="button"
          disabled={!report || exporting}
          onClick={exportCsv}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {exporting ? t('callcenter:reports.exporting') : t('callcenter:reports.exportCsv')}
        </button>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>{t('callcenter:reports.campaign')}</label>
            <select className={inputClass} value={filters.campaignId} onChange={set('campaignId')}>
              <option value="">{t('callcenter:reports.allCampaigns')}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:reports.pool')}</label>
            <select className={inputClass} value={filters.poolId} onChange={set('poolId')}>
              <option value="">{t('callcenter:reports.allPools')}</option>
              {pools.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:reports.fromDate')}</label>
            <input type="date" className={inputClass} value={filters.fromDate} onChange={set('fromDate')} />
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:reports.toDate')}</label>
            <input type="date" className={inputClass} value={filters.toDate} onChange={set('toDate')} />
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading && <div className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>}
        {!loading && error && <div className="py-6 text-center text-theme-sm text-error-500">{error}</div>}

        {!loading && !error && report && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {CARDS.map(([label, key]) => (
                <div
                  key={key}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-theme-sm"
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{report[key] ?? 0}</div>
                  <div className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</div>
                </div>
              ))}
            </div>

            <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-2">{t('callcenter:reports.engagementAreas')}</h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">{t('callcenter:reports.area')}</th>
                    <th className="px-4 py-3">{t('callcenter:reports.count')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.engagementAreaCounts ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        {t('callcenter:reports.noData')}
                      </td>
                    </tr>
                  )}
                  {(report.engagementAreaCounts ?? []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{areaLabel(a.area)}</td>
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-2">{t('callcenter:reports.suggestions')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">{t('callcenter:reports.date')}</th>
                    <th className="px-4 py-3">{t('callcenter:reports.contact')}</th>
                    <th className="px-4 py-3">{t('callcenter:reports.municipality')}</th>
                    <th className="px-4 py-3">{t('callcenter:reports.suggestion')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.suggestions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        {t('callcenter:reports.noData')}
                      </td>
                    </tr>
                  )}
                  {(report.suggestions ?? []).map((s) => (
                    <tr key={s.contactId} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {s.calledAt ? formatDateTime(s.calledAt) : '-'}
                      </td>
                      <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{s.contactName}</td>
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{s.municipalityName ?? '-'}</td>
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{s.suggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(report.suggestions ?? []).length < (report.suggestionsTotal ?? 0) && (
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                {t('callcenter:reports.suggestionsTruncated', {
                  shown: report.suggestions.length,
                  total: report.suggestionsTotal,
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
