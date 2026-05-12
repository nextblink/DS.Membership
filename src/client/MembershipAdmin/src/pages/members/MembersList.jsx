// Members list with filters, query-string state, paged table.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import { EDUCATION_LEVEL_OPTIONS } from './enums'

const PAGE_SIZE_DEFAULT = 20

const inputClass =
  'w-full rounded border border-stroke bg-white px-3 py-2 text-sm text-black focus:border-primary focus:outline-none'
const labelClass = 'block text-xs font-medium text-body mb-1'

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
  const { t } = useTranslation(['members', 'common'])

  // Local form state mirrors URL params so users can type without firing a request per keystroke.
  const [draft, setDraft] = useState(() => ({
    firstName: searchParams.get('firstName') ?? '',
    lastName: searchParams.get('lastName') ?? '',
    jmbg: searchParams.get('jmbg') ?? '',
    orgUnitId: searchParams.get('orgUnitId') ?? '',
    functionId: searchParams.get('functionId') ?? '',
    educationLevel: searchParams.get('educationLevel') ?? '',
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
    for (const [k, v] of Object.entries(draft)) {
      if (v !== '' && v != null) next.set(k, v)
    }
    next.set('page', '1')
    next.set('pageSize', String(pageSize))
    setSearchParams(next)
  }

  function clearFilters() {
    setDraft({
      firstName: '',
      lastName: '',
      jmbg: '',
      orgUnitId: '',
      functionId: '',
      educationLevel: '',
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
    <div className="rounded-sm border border-stroke bg-white shadow-default overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-stroke px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-black">{t('title')}</h1>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addMember')}
        </button>
      </div>

      {/* Filter row */}
      <form onSubmit={applyFilters} className="border-b border-stroke bg-gray-2 px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>{t('filter.firstName')}</label>
            <input
              className={inputClass}
              value={draft.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('filter.lastName')}</label>
            <input
              className={inputClass}
              value={draft.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('filter.jmbg')}</label>
            <input
              className={inputClass}
              value={draft.jmbg}
              onChange={(e) => update('jmbg', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('filter.orgUnit')}</label>
            <select
              className={inputClass}
              value={draft.orgUnitId}
              onChange={(e) => update('orgUnitId', e.target.value)}
            >
              <option value="">All</option>
              {orgUnits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('filter.function')}</label>
            <select
              className={inputClass}
              value={draft.functionId}
              onChange={(e) => update('functionId', e.target.value)}
            >
              <option value="">All</option>
              {functionsList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('filter.educationLevel')}</label>
            <select
              className={inputClass}
              value={draft.educationLevel}
              onChange={(e) => update('educationLevel', e.target.value)}
            >
              <option value="">All</option>
              {EDUCATION_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('filter.occupation')}</label>
            <input
              className={inputClass}
              value={draft.occupation}
              onChange={(e) => update('occupation', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            {t('common:button.apply')}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-stroke bg-white px-4 py-2 text-sm text-black hover:bg-gray-2"
          >
            {t('common:button.clear')}
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-2 text-xs uppercase text-body">
            <tr>
              <th className="px-4 py-3">{t('table.fullName')}</th>
              <th className="px-4 py-3">{t('table.jmbg')}</th>
              <th className="px-4 py-3">{t('table.orgUnit')}</th>
              <th className="px-4 py-3">{t('table.membershipDate')}</th>
              <th className="px-4 py-3">{t('table.functions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-body">
                  {t('common:state.loading')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-body">
                  {t('state.noMembers')}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.items.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-stroke hover:bg-gray-2 cursor-pointer"
                  onClick={() => navigate(`/members/${m.id}`)}
                >
                  <td className="px-4 py-3 text-black">
                    {m.fullName ?? [m.firstName, m.lastName].filter(Boolean).join(' ')}
                  </td>
                  <td className="px-4 py-3">{m.jmbg}</td>
                  <td className="px-4 py-3">{m.orgUnit?.name ?? m.orgUnitName ?? ''}</td>
                  <td className="px-4 py-3">{m.membershipDate ?? ''}</td>
                  <td className="px-4 py-3">{renderFunctions(m)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-stroke px-5 py-4 text-sm">
        <div className="text-body">
          {t('common:pagination.summary', { count: data.totalCount, page: data.page, total: totalPages })}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
            className="rounded-md border border-stroke px-3 py-1 disabled:opacity-50 hover:bg-gray-2"
          >
            {t('common:button.prev')}
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => goToPage(data.page + 1)}
            className="rounded-md border border-stroke px-3 py-1 disabled:opacity-50 hover:bg-gray-2"
          >
            {t('common:button.next')}
          </button>
        </div>
      </div>
    </div>
  )
}

function renderFunctions(m) {
  const list = m.memberFunctions ?? m.functions ?? []
  if (!list.length) return ''
  return list
    .map((f) => f.function?.name ?? f.functionName ?? f.name)
    .filter(Boolean)
    .join(', ')
}
