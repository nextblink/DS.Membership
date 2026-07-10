// Read-only reports dashboard: filter bar (campaign/date range) + scalar metric cards +
// engagement-area/top-suggestion tables + client-side CSV export.
// Styling mirrors pages/callcenter/ContactList.jsx and CampaignForm.jsx conventions.
import { useEffect, useState } from 'react'
import callCenterApi from '../../services/callCenterApi'

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

// CallCenterReportDto field names (camelCase JSON; JsonStringEnumConverter doesn't apply
// here since these are plain ints).
const CARDS = [
  ['Контактирано', 'contacted'],
  ['Неисправни', 'invalidContacts'],
  ['Активни чланови', 'activeMembers'],
  ['Неактивни чланови', 'inactiveMembers'],
  ['Симпатизери', 'sympathizers'],
  ['Без сарадње', 'noCooperation'],
  ['Заинтересовани за активирање', 'interestedInActivating'],
]

export default function CallCenterReports() {
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState({ campaignId: '', fromDate: '', toDate: '' })
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    callCenterApi
      .listCampaigns(1, 100)
      .then((d) => setCampaigns(d.items ?? []))
      .catch(() => setCampaigns([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = {}
    if (filters.campaignId) params.campaignId = filters.campaignId
    if (filters.fromDate) params.fromDate = filters.fromDate
    if (filters.toDate) params.toDate = filters.toDate

    callCenterApi
      .getReport(params)
      .then((d) => {
        if (cancelled) return
        setReport(d)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Учитавање извештаја није успело.')
        setReport(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.campaignId, filters.fromDate, filters.toDate])

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))

  const exportCsv = () => {
    if (!report) return
    const lines = [['Метрика', 'Вредност']]
    CARDS.forEach(([label, key]) => lines.push([label, report[key]]))
    ;(report.engagementAreaCounts ?? []).forEach((a) => lines.push([`Ангажовање: ${a.area}`, a.count]))
    ;(report.topSuggestions ?? []).forEach((s) => lines.push([`Сугестија: ${s.suggestion}`, s.count]))
    const csv = lines.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    // Prefix with BOM so Excel opens Cyrillic UTF-8 content correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'izvestaj-kol-centar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">Извештаји</h1>
        <button
          type="button"
          disabled={!report}
          onClick={exportCsv}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Извоз CSV
        </button>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            <label className={labelClass}>Од датума</label>
            <input type="date" className={inputClass} value={filters.fromDate} onChange={set('fromDate')} />
          </div>
          <div>
            <label className={labelClass}>До датума</label>
            <input type="date" className={inputClass} value={filters.toDate} onChange={set('toDate')} />
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading && <div className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">Учитавање...</div>}
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

            <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-2">Области ангажовања</h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Област</th>
                    <th className="px-4 py-3">Број</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.engagementAreaCounts ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        Нема података.
                      </td>
                    </tr>
                  )}
                  {(report.engagementAreaCounts ?? []).map((a, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{a.area}</td>
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-2">Најчешће сугестије</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Сугестија</th>
                    <th className="px-4 py-3">Број</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.topSuggestions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                        Нема података.
                      </td>
                    </tr>
                  )}
                  {(report.topSuggestions ?? []).map((s, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">{s.suggestion}</td>
                      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
