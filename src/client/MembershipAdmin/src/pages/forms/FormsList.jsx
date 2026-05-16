// Forms list page — filters (URL-driven), paged table.
// Operator scope is enforced server-side; UI is identical for all roles.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../framework/api'
import auth from '../../framework/auth'

const STATUSES = ['Pending', 'Verified', 'Rejected']
const PAGE_SIZE = 20

const STATUS_CLASS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Verified: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
}

function StatusBadge({ status }) {
  const { t } = useTranslation('enums')
  const cls = STATUS_CLASS[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
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

  const [qrOpen, setQrOpen] = useState(false)
  const [qrToken, setQrToken] = useState(null)

  const openQr = () => {
    setQrToken(auth.getToken())
    setQrOpen(true)
  }

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
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('forms:title')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openQr}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Upload from Phone"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
            </svg>
            Upload from Phone
          </button>
          <Link
            to="/forms/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-theme-xs font-medium text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('forms:uploadForm')}
          </Link>
        </div>
      </div>

      {/* Filter row */}
      <form
        data-testid="forms-filter-form"
        onSubmit={applyFilters}
        className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">{t('forms:filter.formNumber')}</label>
            <input
              data-testid="filter-formNumber"
              type="text"
              value={draft.formNumber}
              onChange={(e) => setDraft({ ...draft, formNumber: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none"
              placeholder={t('forms:filter.placeholderFormNumber')}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">{t('forms:filter.orgUnit')}</label>
            <select
              value={draft.orgUnitId}
              onChange={(e) => setDraft({ ...draft, orgUnitId: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">{t('forms:filter.status')}</label>
            <select
              data-testid="filter-status"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none"
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
            <label className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">{t('forms:filter.memberName')}</label>
            <input
              type="text"
              value={draft.memberName}
              onChange={(e) => setDraft({ ...draft, memberName: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none"
              placeholder={t('forms:filter.placeholderMemberName')}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              data-testid="filter-search-btn"
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
              <th className="px-4 py-3">{t('forms:table.formNumber')}</th>
              <th className="px-4 py-3">{t('forms:table.memberName')}</th>
              <th className="px-4 py-3">{t('forms:table.orgUnit')}</th>
              <th className="px-4 py-3">{t('forms:table.status')}</th>
              <th className="px-4 py-3">{t('forms:table.uploadedBy')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                  {t('common:state.loading')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-error-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
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
                  <tr key={f.id} data-testid="forms-row" className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer">
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                      <Link to={`/forms/${f.id}`} className="text-brand-500 hover:underline font-medium">
                        {f.formNumber || `#${f.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{memberName}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{orgUnitName}</td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">{uploadedBy}</td>
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
                  : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
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

      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
          <div className="relative w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-theme-xl">
            <button
              type="button"
              onClick={() => setQrOpen(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-gray-900 dark:hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="mb-4 text-lg font-semibold text-brand-500">Upload from Phone</h3>
            {qrToken && (
              <>
                <div className="flex justify-center mb-4">
                  <QRCodeSVG
                    value={`${window.location.origin}/m/upload?jwt=${encodeURIComponent(qrToken)}`}
                    size={220}
                    level="M"
                  />
                </div>
                <p className="text-center text-theme-xs text-gray-500 dark:text-gray-400">Scan with your phone to upload photos.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
