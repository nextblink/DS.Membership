// Operator landing page: a selectable table of the operator's own callable
// contacts (server-side scope-filtered via ApplyCallContactScope), replacing the
// earlier blind "call next" button. Mirrors ContactList.jsx's outcome/final-status
// enum label logic. Uses PrimeReact (unstyled, Tailwind via `pt`) for the DataTable
// and the municipality AutoComplete filter.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { AutoComplete } from 'primereact/autocomplete'
import callCenterApi from '../../services/callCenterApi'
import { makeScriptMatcher } from '../../services/transliteration'
import { CALL_OUTCOME, toEnumKey } from '../../services/callScript'

// Enum values mirror the backend Enums.cs ordinals (ContactFinalStatus).
const FINAL_STATUS = { ActiveMember: 0, InactiveMember: 1, Sympathizer: 2, NoCooperation: 3 }

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'

const PAGE_SIZE = 20

// Flattens the Municipality tree (city -> children) into a single sorted list for the AutoComplete.
const flattenMunicipalities = (nodes) =>
  (nodes ?? [])
    .flatMap((n) => [{ id: n.id, name: n.name }, ...flattenMunicipalities(n.children)])
    .sort((a, b) => a.name.localeCompare(b.name))

const tableClassNames = {
  root: { className: 'text-sm' },
  wrapper: { className: 'overflow-x-auto' },
  table: { className: 'w-full text-left' },
  thead: { className: 'bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400' },
  headerRow: {},
  tbody: {},
  bodyRow: { className: 'border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30' },
  emptyMessage: { className: 'px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400' },
}

const pageNavButtonClass =
  'rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800'
const pageNavIconClass = 'w-3 h-3'

const paginatorClassNames = {
  root: { className: 'flex items-center gap-1.5 border-t border-gray-200 dark:border-gray-800 px-6 py-4' },
  left: { className: 'mr-auto' },
  firstPageButton: { className: pageNavButtonClass },
  firstPageIcon: { className: pageNavIconClass },
  prevPageButton: { className: pageNavButtonClass },
  prevPageIcon: { className: pageNavIconClass },
  nextPageButton: { className: pageNavButtonClass },
  nextPageIcon: { className: pageNavIconClass },
  lastPageButton: { className: pageNavButtonClass },
  lastPageIcon: { className: pageNavIconClass },
  pages: { className: 'flex items-center gap-1' },
  pageButton: (opts) => ({
    className:
      'rounded-lg border px-3 py-1.5 text-theme-xs ' +
      (opts?.context?.active
        ? 'border-brand-500 bg-brand-500 text-white'
        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'),
  }),
}

export default function CallQueue() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const navigate = useNavigate()
  const location = useLocation()
  const [municipalities, setMunicipalities] = useState([])
  const [municipalitySuggestions, setMunicipalitySuggestions] = useState([])
  const [selectedMunicipality, setSelectedMunicipality] = useState(null)
  const [filters, setFilters] = useState({ municipalityId: '', finalStatus: '', lastOutcome: '' })
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [claimingId, setClaimingId] = useState(null)
  // Seed the error banner with a one-time warning passed from MemberCreate.jsx
  // when the call contact was created as a member but the server-side
  // conversion link (setConverted) failed to save.
  const [error, setError] = useState(
    location.state?.conversionWarning ? t('callcenter:queue.conversionWarning') : null
  )

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
      .listMunicipalities()
      .then((tree) => setMunicipalities(flattenMunicipalities(tree)))
      .catch(() => setMunicipalities([]))
  }, [])

  const filterKey = useMemo(() => JSON.stringify(filters), [filters])
  const refreshKey = useMemo(() => `${page}|${filterKey}`, [page, filterKey])

  const load = () => {
    let cancelled = false
    setLoading(true)
    const params = { page, pageSize: PAGE_SIZE, unresolvedOnly: true }
    if (filters.municipalityId) params.municipalityId = filters.municipalityId
    if (filters.finalStatus !== '') params.finalStatus = filters.finalStatus
    if (filters.lastOutcome !== '') params.lastOutcome = filters.lastOutcome

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
        setError(err?.response?.data?.message || t('callcenter:queue.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }

  useEffect(() => {
    const cancel = load()
    return cancel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const callContact = async (contactId) => {
    setClaimingId(contactId)
    setError(null)
    try {
      await callCenterApi.claim(contactId)
      navigate(`/callcenter/call/${contactId}`)
    } catch (err) {
      const status = err?.response?.status
      const code = err?.response?.data?.error
      if (status === 409 && code === 'already_claimed') {
        setError(t('callcenter:queue.alreadyClaimed'))
      } else if (status === 409 && code === 'already_resolved') {
        setError(t('callcenter:queue.alreadyResolved'))
      } else {
        setError(err?.response?.data?.message || t('callcenter:queue.claimFailed'))
      }
      load()
    } finally {
      setClaimingId(null)
    }
  }

  const set = (k) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  }

  const searchMunicipalities = (e) => {
    const matches = makeScriptMatcher(e.query.trim())
    setMunicipalitySuggestions(municipalities.filter((m) => matches(m.name)))
  }

  // `selectedMunicipality` is the AutoComplete's own display value — a plain string while the
  // user is typing, or the selected municipality object once committed. `filters.municipalityId`
  // (the actual query filter) only ever changes here, in this one place, on commit/clear —
  // never as a side effect of the in-progress typing in onMunicipalityChange.
  const commitMunicipality = (municipality) => {
    setSelectedMunicipality(municipality)
    setPage(1)
    setFilters((f) => ({ ...f, municipalityId: municipality?.id ?? '' }))
  }

  const onMunicipalityChange = (e) => {
    setSelectedMunicipality(e.value)
    if (!e.value) commitMunicipality(null)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('callcenter:queue.title')}</h1>
      </div>

      {/* Filter bar */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>{t('callcenter:queue.filters.municipality')}</label>
            <AutoComplete
              value={selectedMunicipality}
              suggestions={municipalitySuggestions}
              completeMethod={searchMunicipalities}
              onChange={onMunicipalityChange}
              onSelect={(e) => commitMunicipality(e.value)}
              onClear={() => commitMunicipality(null)}
              field="name"
              dropdown
              forceSelection
              placeholder={t('callcenter:queue.filters.allMunicipalities')}
              pt={{
                root: { className: 'w-full flex items-stretch h-[31px]' },
                input: { root: { className: `${inputClass} flex-1 min-w-0 h-full leading-none rounded-r-none` } },
                loadingIcon: { className: 'hidden' },
                dropdownButton: {
                  root: {
                    className:
                      'shrink-0 h-full flex items-center justify-center rounded-r-md rounded-l-none border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400',
                  },
                },
                panel: {
                  className:
                    'mt-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm',
                },
                list: { className: 'max-h-60 overflow-y-auto py-1' },
                item: {
                  className:
                    'px-3 py-1.5 text-theme-xs cursor-pointer text-gray-700 dark:text-gray-300 ' +
                    'hover:bg-brand-50 dark:hover:bg-brand-500/10 ' +
                    'data-[p-highlight=true]:bg-brand-50 dark:data-[p-highlight=true]:bg-brand-500/10 ' +
                    'data-[p-highlight=true]:text-brand-600 dark:data-[p-highlight=true]:text-brand-400',
                },
                emptyMessage: { className: 'px-3 py-1.5 text-theme-xs text-gray-500 dark:text-gray-400' },
              }}
            />
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:queue.filters.status')}</label>
            <select className={inputClass} value={filters.finalStatus} onChange={set('finalStatus')}>
              <option value="">{t('callcenter:queue.filters.allStatuses')}</option>
              {Object.entries(FINAL_STATUS).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:contactFinalStatus.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('callcenter:queue.filters.outcome')}</label>
            <select className={inputClass} value={filters.lastOutcome} onChange={set('lastOutcome')}>
              <option value="">{t('callcenter:queue.filters.allOutcomes')}</option>
              {Object.entries(CALL_OUTCOME).map(([k, v]) => (
                <option key={v} value={v}>
                  {t(`enums:callOutcome.${toEnumKey(k)}`, k)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {error}
        </div>
      )}

      <DataTable
        value={data.items}
        dataKey="id"
        loading={loading}
        emptyMessage={t('callcenter:queue.empty')}
        lazy
        paginator
        paginatorPosition="both"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
        paginatorLeft={
          <span className="text-theme-xs text-gray-500 dark:text-gray-400">
            {t('common:pagination.summary', { count: data.totalCount, page: data.page, total: data.totalPages || 1 })}
          </span>
        }
        first={(page - 1) * PAGE_SIZE}
        rows={PAGE_SIZE}
        totalRecords={data.totalCount}
        onPage={(e) => setPage((e.page ?? 0) + 1)}
        pt={{ ...tableClassNames, paginator: paginatorClassNames }}
      >
        <Column
          header={t('callcenter:queue.columns.name')}
          body={(c) => `${c.lastName} ${c.firstName}`}
          pt={{ headerCell: { className: 'px-4 py-3' }, bodyCell: { className: 'px-4 py-3 text-theme-sm text-gray-900 dark:text-white' } }}
        />
        <Column
          header={t('callcenter:queue.columns.phone')}
          field="phoneNumber"
          pt={{ headerCell: { className: 'px-4 py-3' }, bodyCell: { className: 'px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300' } }}
        />
        <Column
          header={t('callcenter:queue.columns.place')}
          body={(c) => c.municipalityName ?? c.city ?? '-'}
          pt={{ headerCell: { className: 'px-4 py-3' }, bodyCell: { className: 'px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300' } }}
        />
        <Column
          header={t('callcenter:queue.columns.tries')}
          field="attemptCount"
          pt={{
            headerCell: { className: 'px-4 py-3 w-24 whitespace-nowrap' },
            bodyCell: { className: 'px-4 py-3 w-24 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300' },
          }}
        />
        <Column
          header={t('callcenter:queue.columns.outcome')}
          body={(c) => outcomeLabel(c.lastOutcome)}
          pt={{
            headerCell: { className: 'px-4 py-3 w-32 whitespace-nowrap' },
            bodyCell: { className: 'px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300' },
          }}
        />
        <Column
          header={t('callcenter:queue.columns.status')}
          body={(c) => finalStatusLabel(c.finalStatus)}
          pt={{
            headerCell: { className: 'px-4 py-3 w-32 whitespace-nowrap' },
            bodyCell: { className: 'px-4 py-3 w-32 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300' },
          }}
        />
        <Column
          header=""
          body={(c) => (
            <button
              type="button"
              disabled={claimingId === c.id}
              onClick={() => callContact(c.id)}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-theme-xs font-medium text-white disabled:opacity-50"
            >
              {claimingId === c.id ? t('callcenter:queue.claiming') : t('callcenter:queue.call')}
            </button>
          )}
          pt={{
            headerCell: { className: 'px-4 py-3 w-28 whitespace-nowrap' },
            bodyCell: { className: 'px-4 py-3 w-28 whitespace-nowrap text-theme-sm text-right' },
          }}
        />
      </DataTable>
    </div>
  )
}
