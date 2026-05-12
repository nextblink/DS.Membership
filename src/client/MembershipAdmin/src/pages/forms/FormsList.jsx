// Forms list page — filters (URL-driven), paged table.
// Operator scope is enforced server-side; UI is identical for all roles.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

const STATUSES = ['Pending', 'Verified', 'Rejected']
const PAGE_SIZE = 20

const STATUS_CLASS = {
  Pending: 'bg-warning-50 dark:bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-700',
  Verified: 'bg-success-50 dark:bg-success-500/10 text-success-700 dark:text-success-400 border-success-200 dark:border-success-700',
  Rejected: 'bg-error-50 dark:bg-error-500/10 text-error-700 dark:text-error-400 border-error-200 dark:border-error-700',
}

function StatusBadge({ status }) {
  const { t } = useTranslation('enums')
  const cls = STATUS_CLASS[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-theme-xs font-medium ${cls}`}>
      {t(`formStatus.${status.toLowerCase()}`) || status}
    </span>
  )
}

export default function FormsList() {
  const { t } = useTranslation(['forms', 'enums', 'common'])
  const [searchParams, setSearchParams] = useSearchParams()

  const formNumber = searchParams.get('formNumber') || ''
  const orgUnitId = searchParams.get('orgUnitId') || ''
  const status = searchParams.get('status') || ''
  const memberName = searchParams.get('memberName') || ''
  const page = parseInt(searchParams.get('page') || '1', 10) || 1
  const pageSize = parseInt(searchParams.get('pageSize') || String(PAGE_SIZE), 10) || PAGE_SIZE

  // Local form state — synced into URL on submit so URLs stay shareable.
  const [draft, setDraft] = useState({ formNumber, orgUnitId, status, memberName })

  useEffect(() => {
    setDraft({ formNumber, orgUnitId, status, memberName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formNumber, orgUnitId, status, memberName])

  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [orgUnits, setOrgUnits] = useState([])

  useEffect(() => {
    let cancelled = false
    api
      .get('/api/orgunits')
      .then((res) => {
        if (cancelled) return
        const data = res.data
        // Accept either flat array or tree — flatten if needed.
        const flat = []
        const walk = (nodes) => {
          if (!Array.isArray(nodes)) return
          for (const n of nodes) {
            flat.push({ id: n.id, name: n.name })
            if (n.children) walk(n.children)
          }
        }
        if (Array.isArray(data)) walk(data)
        else if (data?.items) walk(data.items)
        setOrgUnits(flat)
      })
      .catch(() => {
        if (!cancelled) setOrgUnits([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = { page, pageSize }
    if (formNumber) params.formNumber = formNumber
    if (orgUnitId) params.orgUnitId = orgUnitId
    if (status) params.status = status
    if (memberName) params.memberName = memberName

    api
      .get('/api/forms', { params })
      .then((res) => {
        if (cancelled) return
        const data = res.data || {}
        setItems(data.items || [])
        setTotalCount(data.totalCount || 0)
        setTotalPages(data.totalPages || 1)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.response?.data?.message || err.message || t('forms:state.loadFailed'))
        setItems([])
        setTotalCount(0)
        setTotalPages(1)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formNumber, orgUnitId, status, memberName, page, pageSize])

  const applyFilters = (e) => {
    e?.preventDefault?.()
    const next = new URLSearchParams()
    if (draft.formNumber) next.set('formNumber', draft.formNumber)
    if (draft.orgUnitId) next.set('orgUnitId', draft.orgUnitId)
    if (draft.status) next.set('status', draft.status)
    if (draft.memberName) next.set('memberName', draft.memberName)
    next.set('page', '1')
    next.set('pageSize', String(pageSize))
    setSearchParams(next)
  }

  const clearFilters = () => {
    setDraft({ formNumber: '', orgUnitId: '', status: '', memberName: '' })
    setSearchParams(new URLSearchParams())
  }

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  const pageNumbers = useMemo(() => {
    const total = totalPages || 1
    const out = []
    const start = Math.max(1, page - 2)
    const end = Math.min(total, start + 4)
    for (let i = start; i <= end; i++) out.push(i)
    return out
  }, [page, totalPages])

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t('forms:title')}</h1>
        <Link
          to="/forms/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('forms:uploadForm')}
        </Link>
      </div>

      {/* Filter row */}
      <form
        data-testid="forms-filter-form"
        onSubmit={applyFilters}
        className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-6 py-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:filter.formNumber')}</label>
            <input
              data-testid="filter-formNumber"
              type="text"
              value={draft.formNumber}
              onChange={(e) => setDraft({ ...draft, formNumber: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              placeholder={t('forms:filter.placeholderFormNumber')}
            />
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:filter.orgUnit')}</label>
            <select
              value={draft.orgUnitId}
              onChange={(e) => setDraft({ ...draft, orgUnitId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">{t('enums:all')}</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:filter.status')}</label>
            <select
              data-testid="filter-status"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
            >
              <option value="">{t('enums:all')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`enums:formStatus.${s.toLowerCase()}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-theme-xs font-medium text-gray-600 dark:text-gray-400">{t('forms:filter.memberName')}</label>
            <input
              type="text"
              value={draft.memberName}
              onChange={(e) => setDraft({ ...draft, memberName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-theme-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500"
              placeholder={t('forms:filter.placeholderMemberName')}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              data-testid="filter-search-btn"
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
            >
              {t('common:button.search')}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
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
              <th className="px-4 py-3">{t('forms:table.formNumber')}</th>
              <th className="px-4 py-3">{t('forms:table.memberName')}</th>
              <th className="px-4 py-3">{t('forms:table.orgUnit')}</th>
              <th className="px-4 py-3">{t('forms:table.scanDate')}</th>
              <th className="px-4 py-3">{t('forms:table.status')}</th>
              <th className="px-4 py-3">{t('forms:table.uploadedBy')}</th>
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
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('forms:state.noForms')}
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              items.map((f) => {
                const memberName =
                  f.memberName ||
                  (f.member ? `${f.member.firstName ?? ''} ${f.member.lastName ?? ''}`.trim() : '') ||
                  '—'
                const orgUnitName = f.orgUnitName || f.member?.orgUnit?.name || f.member?.orgUnitName || '—'
                const uploadedBy = f.createdByEmail || f.uploadedBy || f.createdBy?.email || '—'
                return (
                  <tr key={f.id} data-testid="forms-row" className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <Link to={`/forms/${f.id}`} className="text-brand-500 hover:underline">
                        {f.formNumber || `#${f.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{memberName}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{orgUnitName}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{f.scanDate ? String(f.scanDate).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-500 dark:text-gray-400">{uploadedBy}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
          {t('forms:pagination.showing', { page, total: totalPages, count: totalCount })}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.prev')}
          </button>
          {pageNumbers.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              className={`rounded-lg border px-3 py-1.5 text-theme-xs ${
                p === page
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs text-gray-600 dark:text-gray-400 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common:button.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
