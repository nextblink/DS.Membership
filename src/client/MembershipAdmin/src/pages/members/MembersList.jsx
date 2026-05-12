// Members list with filters, query-string state, paged table.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
        setError(err?.response?.data?.message || 'Failed to load members')
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-black">Members</h1>
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
        >
          + Add Member
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="rounded border border-stroke bg-white p-4 shadow-sm mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>First Name</label>
            <input
              className={inputClass}
              value={draft.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input
              className={inputClass}
              value={draft.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>JMBG</label>
            <input
              className={inputClass}
              value={draft.jmbg}
              onChange={(e) => update('jmbg', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Org Unit</label>
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
            <label className={labelClass}>Function</label>
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
            <label className={labelClass}>Education Level</label>
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
            <label className={labelClass}>Occupation</label>
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
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded border border-stroke px-4 py-2 text-sm text-black hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="rounded border border-stroke bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-body">
            <tr>
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">JMBG</th>
              <th className="px-4 py-3">Org Unit</th>
              <th className="px-4 py-3">Membership Date</th>
              <th className="px-4 py-3">Functions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-body">
                  Loading...
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
                  No members found.
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              data.items.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-stroke hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/members/${m.id}`)}
                >
                  <td className="px-4 py-3 text-black">
                    {[m.firstName, m.lastName].filter(Boolean).join(' ')}
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
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-body">
          {data.totalCount} total · page {data.page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => goToPage(data.page - 1)}
            className="rounded border border-stroke px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={data.page >= totalPages}
            onClick={() => goToPage(data.page + 1)}
            className="rounded border border-stroke px-3 py-1 disabled:opacity-50 hover:bg-gray-50"
          >
            Next
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
