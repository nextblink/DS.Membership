// Forms list page — filters (URL-driven), paged table.
// Operator scope is enforced server-side; UI is identical for all roles.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../framework/api'

const STATUSES = ['Pending', 'Verified', 'Rejected']
const PAGE_SIZE = 20

const STATUS_CLASS = {
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Verified: 'bg-green-100 text-green-800 border-green-300',
  Rejected: 'bg-red-100 text-red-800 border-red-300',
}

function StatusBadge({ status }) {
  const cls = STATUS_CLASS[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

export default function FormsList() {
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
        setError(err?.response?.data?.message || err.message || 'Failed to load forms')
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
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Forms</h1>
        <Link
          to="/forms/new"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          Upload Form
        </Link>
      </div>

      <form
        data-testid="forms-filter-form"
        onSubmit={applyFilters}
        className="mb-4 grid grid-cols-1 gap-3 rounded border border-stroke bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-body">Form Number</label>
          <input
            data-testid="filter-formNumber"
            type="text"
            value={draft.formNumber}
            onChange={(e) => setDraft({ ...draft, formNumber: e.target.value })}
            className="w-full rounded border border-stroke px-3 py-2 text-sm"
            placeholder="e.g. F-12345"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-body">Org Unit</label>
          <select
            value={draft.orgUnitId}
            onChange={(e) => setDraft({ ...draft, orgUnitId: e.target.value })}
            className="w-full rounded border border-stroke px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {orgUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-body">Status</label>
          <select
            data-testid="filter-status"
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="w-full rounded border border-stroke px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-body">Member Name</label>
          <input
            type="text"
            value={draft.memberName}
            onChange={(e) => setDraft({ ...draft, memberName: e.target.value })}
            className="w-full rounded border border-stroke px-3 py-2 text-sm"
            placeholder="First or last name"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            data-testid="filter-search-btn"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Search
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-stroke px-4 py-2 text-sm font-medium text-body hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded border border-stroke bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-body">
            <tr>
              <th className="px-4 py-3">Form Number</th>
              <th className="px-4 py-3">Member Name</th>
              <th className="px-4 py-3">Org Unit</th>
              <th className="px-4 py-3">Scan Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Uploaded By</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-body">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-body">
                  No forms found.
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
                  <tr key={f.id} data-testid="forms-row" className="border-t border-stroke hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/forms/${f.id}`} className="text-primary hover:underline">
                        {f.formNumber || `#${f.id}`}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{memberName}</td>
                    <td className="px-4 py-3">{orgUnitName}</td>
                    <td className="px-4 py-3">{f.scanDate ? String(f.scanDate).slice(0, 10) : '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-body">{uploadedBy}</td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-body">
            Showing page {page} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="rounded border border-stroke px-3 py-1 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`rounded border px-3 py-1 text-sm ${
                  p === page
                    ? 'border-primary bg-primary text-white'
                    : 'border-stroke text-body hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="rounded border border-stroke px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
