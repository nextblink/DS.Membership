// Contact list: filter by campaign/city/final status/outcome/search, paginated table.
// Mirrors the card/table + pagination markup from pages/callcenter/PoolList.jsx and
// pages/members/MembersList.jsx (pagination pattern).
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Column } from 'primereact/column'
import callCenterApi from '../../services/callCenterApi'
import { CALL_OUTCOME, ENGAGEMENT_AREA, toEnumKey } from '../../services/callScript'
import ServerDataTable, { columnHeaderPt, columnBodyPt } from '../../components/ServerDataTable'
import MunicipalityAutoComplete from '../../components/MunicipalityAutoComplete'
import auth from '../../framework/auth'

// Enum values mirror the backend Enums.cs ordinals (ContactFinalStatus).
const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

const PAGE_SIZE = 20

// Shared by the grid query and the CSV export so the exported file always matches the
// filters the operator is looking at.
function queryParams(filters) {
  const params = {}
  if (filters.campaignId) params.campaignId = filters.campaignId
  if (filters.municipalityId) params.municipalityId = filters.municipalityId
  if (filters.finalStatus !== '') params.finalStatus = filters.finalStatus
  if (filters.lastOutcome !== '') params.lastOutcome = filters.lastOutcome
  if (filters.engagementArea !== '') params.engagementArea = filters.engagementArea
  if (filters.wantsToBeActive !== '') params.wantsToBeActive = filters.wantsToBeActive
  if (filters.search) params.search = filters.search
  return params
}

const EMPTY_FILTERS = {
  campaignId: '', municipalityId: '', finalStatus: '', lastOutcome: '', search: '',
  engagementArea: '', wantsToBeActive: '',
}

export default function ContactList() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const [campaigns, setCampaigns] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [exporting, setExporting] = useState(false)
  // Mirrors the [Authorize(Roles = "SuperAdmin,Admin")] on GET /api/call-contacts/export —
  // showing an Operator a button that can only 403 would be worse than hiding it.
  const canExport = ['SuperAdmin', 'Admin'].includes(auth.getRole())
  // Default sort is address, ascending; clicking Name/Address toggles field/direction
  // (PrimeReact's normal asc -> desc -> asc single-column-sort cycle).
  const [sortField, setSortField] = useState('address')
  const [sortOrder, setSortOrder] = useState(1)
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
    const params = { ...queryParams(filters), page, pageSize: PAGE_SIZE, sortBy: sortField, sortDesc: sortOrder === -1 }

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
  }, [page, filterKey, sortField, sortOrder])

  const set = (k) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  }

  const totalPages = data.totalPages || 1
  const hasFilters = Object.keys(EMPTY_FILTERS).some((k) => filters[k] !== EMPTY_FILTERS[k])

  const resetFilters = () => {
    setPage(1)
    setFilters(EMPTY_FILTERS)
  }

  // Server-side export: the endpoint returns every row matching the current filters, not
  // just the page on screen, so "give me everyone interested in campaigns" is one click.
  const exportCsv = async () => {
    setExporting(true)
    setError(null)
    try {
      const blob = await callCenterApi.exportContacts(queryParams(filters))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kontakti-kol-centar.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('callcenter:contacts.exportFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:contacts.title')}</h1>
        {canExport && (
          <button
            type="button"
            disabled={exporting}
            onClick={exportCsv}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-theme-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {exporting ? t('callcenter:contacts.exporting') : t('callcenter:contacts.exportCsv')}
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className={labelClass}>{t('callcenter:contacts.filters.municipality')}</label>
            <MunicipalityAutoComplete
              value={filters.municipalityId}
              onChange={(id) => {
                setPage(1)
                setFilters((f) => ({ ...f, municipalityId: id }))
              }}
              placeholder={t('callcenter:contacts.filters.allMunicipalities')}
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
            <label className={labelClass}>{t('callcenter:contacts.filters.engagementArea')}</label>
            <select className={inputClass} value={filters.engagementArea} onChange={set('engagementArea')}>
              <option value="">{t('callcenter:contacts.filters.allAreas')}</option>
              {Object.entries(ENGAGEMENT_AREA).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:engagementArea.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:contacts.filters.wantsActive')}</label>
            <select className={inputClass} value={filters.wantsToBeActive} onChange={set('wantsToBeActive')}>
              <option value="">{t('callcenter:contacts.filters.wantsActiveAny')}</option>
              <option value="true">{t('callcenter:contacts.filters.wantsActiveYes')}</option>
              <option value="false">{t('callcenter:contacts.filters.wantsActiveNo')}</option>
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
          {/* Sits in the grid as its own cell so it lines up with the inputs above it. */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t('common:button.clear')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <ServerDataTable
        items={data.items}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={data.totalCount}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
        emptyMessage={t('callcenter:contacts.empty')}
        summaryText={t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={(e) => {
          setSortField(e.sortField)
          setSortOrder(e.sortOrder)
          setPage(1)
        }}
      >
        <Column
          header={t('callcenter:contacts.columns.name')}
          field="name"
          sortable
          body={(c) => `${c.lastName} ${c.firstName}`}
          pt={{
            headerCell: columnHeaderPt(),
            headerTitle: { className: 'cursor-pointer select-none' },
            sortIcon: { className: 'ml-1 text-theme-xs' },
            bodyCell: columnBodyPt('text-gray-900 dark:text-white'),
          }}
        />
        <Column
          header={t('callcenter:contacts.columns.address')}
          field="address"
          sortable
          body={(c) => c.address ?? '-'}
          pt={{
            headerCell: columnHeaderPt(),
            headerTitle: { className: 'cursor-pointer select-none' },
            sortIcon: { className: 'ml-1 text-theme-xs' },
            bodyCell: columnBodyPt(),
          }}
        />
        <Column
          header={t('callcenter:contacts.columns.phone')}
          field="phoneNumber"
          pt={{ headerCell: columnHeaderPt(), bodyCell: columnBodyPt() }}
        />
        <Column
          header={t('callcenter:contacts.columns.secondaryPhone')}
          body={(c) => c.secondaryPhone ?? '-'}
          pt={{ headerCell: columnHeaderPt(), bodyCell: columnBodyPt() }}
        />
        <Column
          header={t('callcenter:contacts.columns.municipality')}
          body={(c) => c.municipalityName ?? c.city ?? '-'}
          pt={{ headerCell: columnHeaderPt(), bodyCell: columnBodyPt() }}
        />
        <Column
          header={t('callcenter:contacts.columns.tries')}
          field="attemptCount"
          pt={{ headerCell: columnHeaderPt('w-24 whitespace-nowrap'), bodyCell: columnBodyPt('w-24 whitespace-nowrap') }}
        />
        <Column
          header={t('callcenter:contacts.columns.outcome')}
          body={(c) => outcomeLabel(c.lastOutcome)}
          pt={{ headerCell: columnHeaderPt('w-32 whitespace-nowrap'), bodyCell: columnBodyPt('w-32 whitespace-nowrap') }}
        />
        <Column
          header={t('callcenter:contacts.columns.status')}
          body={(c) => finalStatusLabel(c.finalStatus)}
          pt={{ headerCell: columnHeaderPt('w-32 whitespace-nowrap'), bodyCell: columnBodyPt('w-32 whitespace-nowrap') }}
        />
      </ServerDataTable>
    </div>
  )
}
