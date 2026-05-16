// Members list with filters, query-string state, paged table.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { EDUCATION_LEVEL_OPTIONS, GENDER_OPTIONS } from './enums'
import { formatDate } from '../../services/dateUtils'

const PAGE_SIZE_DEFAULT = 20

const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
const labelClass = 'block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1'

function flattenOrgUnits(data) {
  const out = []
  const list = Array.isArray(data) ? data : data?.items ?? []
  function walk(nodes, depth) {
    for (const n of nodes) {
      out.push({ id: n.id, label: `${'— '.repeat(depth)}${n.name}` })
      if (n.children && n.children.length) walk(n.children, depth + 1)
    }
  }
  walk(list, 0)
  return out
}

export default function MembersList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation(['members', 'common', 'enums'])

  // Local form state mirrors URL params so users can type without firing a request per keystroke.
  // "name" is a combined first+last search field — sent as both firstName and lastName params.
  const [draft, setDraft] = useState(() => ({
    name: searchParams.get('firstName') ?? searchParams.get('lastName') ?? '',
    jmbg: searchParams.get('jmbg') ?? '',
    orgUnitId: searchParams.get('orgUnitId') ?? '',
    functionId: searchParams.get('functionId') ?? '',
    educationLevel: searchParams.get('educationLevel') ?? '',
    gender: searchParams.get('gender') ?? '',
    occupation: searchParams.get('occupation') ?? '',
  }))

  const page = Number(searchParams.get('page') ?? '1') || 1
  const pageSize = Number(searchParams.get('pageSize') ?? PAGE_SIZE_DEFAULT) || PAGE_SIZE_DEFAULT

  const [orgUnits, setOrgUnits] = useState([])
  const [functionsList, setFunctionsList] = useState([])
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize, totalPages: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load lookups once.
  useEffect(() => {
    let cancelled = false
    Promise.all([api.get('/api/orgunits'), api.get('/api/functions')])
      .then(([orgRes, fnRes]) => {
        if (cancelled) return
        setOrgUnits(flattenOrgUnits(orgRes.data))
        setFunctionsList(Array.isArray(fnRes.data) ? fnRes.data : fnRes.data?.items ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch members when URL params change.
  const queryKey = useMemo(() => searchParams.toString(), [searchParams])
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = {}
    for (const [k, v] of searchParams.entries()) {
      if (v !== '' && v != null) params[k] = v
    }
    if (!params.page) params.page = 1
    if (!params.pageSize) params.pageSize = PAGE_SIZE_DEFAULT

    api
      .get('/api/members', { params })
      .then((res) => {
        if (cancelled) return
        const d = res.data ?? {}
        setData({
          items: d.items ?? [],
          totalCount: d.totalCount ?? 0,
          page: d.page ?? 1,
          pageSize: d.pageSize ?? PAGE_SIZE_DEFAULT,
          totalPages: d.totalPages ?? 0,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || t('state.loadFailed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey])

  function applyFilters(e) {
    e?.preventDefault?.()
    const next = new URLSearchParams()
    // "name" searches both firstName and lastName
    if (draft.name !== '' && draft.name != null) {
      next.set('firstName', draft.name)
      next.set('lastName', draft.name)
    }
    const { name: _name, ...rest } = draft
    for (const [k, v] of Object.entries(rest)) {
      if (v !== '' && v != null) next.set(k, v)
    }
    next.set('page', '1')
    next.set('pageSize', String(pageSize))
    setSearchParams(next)
  }

  function clearFilters() {
    setDraft({
      name: '',
      jmbg: '',
      orgUnitId: '',
      functionId: '',
      educationLevel: '',
      gender: '',
      occupation: '',
    })
    const next = new URLSearchParams()
    next.set('page', '1')
    next.set('pageSize', String(pageSize))
    setSearchParams(next)
  }

  function goToPage(p) {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  function update(k, v) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  const totalPages = data.totalPages || Math.max(1, Math.ceil(data.totalCount / pageSize))

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addMember')}
        </button>
      </div>

      {/* Filter row */}
      <form onSubmit={applyFilters} className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* 1. Combined Name field (searches firstName + lastName) */}
          <div>
            <label className={labelClass}>{t('filter.name')}</label>
            <input
              className={inputClass}
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('filter.namePlaceholder', '')}
            />
          </div>

          {/* 2. JMBG — numeric only */}
          <div>
            <label className={labelClass}>{t('filter.jmbg')}</label>
            <input
              className={inputClass}
              inputMode="numeric"
              pattern="[0-9]*"
              value={draft.jmbg}
              onChange={(e) => update('jmbg', e.target.value.replace(/\D/g, ''))}
            />
          </div>

          {/* 3. OrgUnit */}
          <div>
            <label className={labelClass}>{t('filter.orgUnit')}</label>
            <select
              className={inputClass}
              value={draft.orgUnitId}
              onChange={(e) => update('orgUnitId', e.target.value)}
            >
              <option value="">{t('enums:all')}</option>
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Function */}
          <div>
            <label className={labelClass}>{t('filter.function')}</label>
            <select
              className={inputClass}
              value={draft.functionId}
              onChange={(e) => update('functionId', e.target.value)}
            >
              <option value="">{t('enums:all')}</option>
              {functionsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Occupation */}
          <div>
            <label className={labelClass}>{t('filter.occupation')}</label>
            <input
              className={inputClass}
              value={draft.occupation}
              onChange={(e) => update('occupation', e.target.value)}
            />
          </div>

          {/* 6. Education Level — segmented button group */}
          <div className="col-span-2 md:col-span-3">
            <label className={labelClass}>{t('filter.educationLevel')}</label>
            <div className="flex flex-wrap gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit">
              {[{ value: '', label: t('enums:all') }, ...EDUCATION_LEVEL_OPTIONS.map((o) => ({ value: o.value, label: t(`enums:educationLevel.${o.value.toLowerCase()}`) }))].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update('educationLevel', o.value)}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                    draft.educationLevel === o.value
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Gender — segmented button group */}
          <div className="col-span-2 md:col-span-1">
            <label className={labelClass}>{t('filter.gender')}</label>
            <div className="flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit">
              {[{ value: '', label: t('enums:all') }, ...GENDER_OPTIONS.map((o) => ({ value: o.value, label: t(`enums:gender.${o.value.toLowerCase()}`) }))].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => update('gender', o.value)}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${
                    draft.gender === o.value
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {/* 8. Apply / Clear buttons — end of second row */}
          <div className="col-span-2 md:col-span-1 flex items-end gap-1.5">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-theme-xs font-medium text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              {t('common:button.search')}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-theme-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
              {t('common:button.clear')}
            </button>
          </div>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">{t('table.fullName')}</th>
              <th className="px-4 py-3">{t('table.jmbg')}</th>
              <th className="px-4 py-3">{t('table.orgUnit')}</th>
              <th className="px-4 py-3">{t('table.functions')}</th>
              <th className="px-4 py-3 w-36 whitespace-nowrap">{t('table.membershipDate')}</th>
              <th className="px-4 py-3 w-32 whitespace-nowrap">{t('table.seniority')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('common:state.loading')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('state.noMembers')}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.items.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer"
                  onClick={() => navigate(`/members/${m.id}`)}
                >
                  <td className="px-4 py-3 text-theme-sm text-gray-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      {m.gender === 'Male' ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="9" cy="15" r="6"/>
                          <path d="M15 9l6-6M21 3h-5M21 3v5"/>
                        </svg>
                      ) : m.gender === 'Female' ? (
                        <svg className="h-3.5 w-3.5 shrink-0 text-pink-500 dark:text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="9" r="6"/>
                          <path d="M12 15v6M9 18h6"/>
                        </svg>
                      ) : null}
                      {m.fullName ?? [m.firstName, m.lastName].filter(Boolean).join(' ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{m.jmbg}</td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{m.orgUnit?.name ?? m.orgUnitName ?? ''}</td>
                  <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{renderFunctions(m)}</td>
                  <td className="px-4 py-3 w-36 whitespace-nowrap text-theme-sm text-gray-700 dark:text-gray-300">{formatDate(m.membershipDate)}</td>
                  <td className="px-4 py-3 w-32">
                    <MembershipBar date={m.membershipDate} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.prev')}
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => goToPage(data.page + 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.next')}
          </button>
        </div>
      </div>
    </div>
  )
}

const MAX_MONTHS = 15 * 12 // 180 months = 15 years

function memberDuration(dateStr) {
  if (!dateStr) return ''
  const months = calcMonths(dateStr)
  if (months < 1) return '< 1 mo'
  if (months < 24) return `${months} mo`
  return `${Math.floor(months / 12)} yr`
}

function calcMonths(dateStr) {
  const start = new Date(dateStr)
  const now = new Date()
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
}

function MembershipBar({ date }) {
  if (!date) return null
  const months = calcMonths(date)
  const pct = Math.min(100, Math.round((months / MAX_MONTHS) * 100))
  const label = memberDuration(date)

  const color =
    pct >= 75 ? '#4ABEA0' :
    pct >= 40 ? '#2e6bad' :
    '#f79009'

  return (
    <div className="flex flex-col gap-1 min-w-[110px]">
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>
        {label}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function renderFunctions(m) {
  const list = m.memberFunctions ?? m.functions ?? []
  if (!list.length) return ''
  return list
    .map((f) => (typeof f === 'string' ? f : (f.function?.name ?? f.functionName ?? f.name)))
    .filter(Boolean)
    .join(', ')
}
