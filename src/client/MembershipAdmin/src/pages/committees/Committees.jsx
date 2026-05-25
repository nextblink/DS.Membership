// Committees tree page — SuperAdmin only (route enforces role).
//
// Renders the committee hierarchy (City -> Municipal) from GET /api/committees.
// Supports inline VoterCount edit, add-root, add-child, and leaf delete.
// View can be toggled between table and Leaflet map.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../framework/api'
import { useToast, ToastContainer } from '../../components/Toast'
import { makeScriptMatcher } from '../../services/transliteration'

const TYPE_CITY = 'City'
const TYPE_MUNICIPAL = 'Municipal'

function computePromille(node) {
  if (node.voterCount > 0) return (node.memberCount / node.voterCount) * 1000
  return 0
}

function barColor(pm) {
  if (pm >= 1) return '#4ABEA0'
  if (pm >= 0.8) return '#f79009'
  return '#f04438'
}

function PromilleBar({ pm }) {
  const clamped = Math.min(100, (pm / 2) * 100)
  const color = barColor(pm)
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, background: color }}
        />
      </div>
      <span className="w-14 text-right text-theme-xs font-semibold tabular-nums" style={{ color }}>
        {pm.toFixed(2)}‰
      </span>
    </div>
  )
}

function typeBadgeClass(type) {
  if (type === TYPE_CITY) {
    return 'inline-flex rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-brand-600 dark:text-brand-400'
  }
  return 'inline-flex rounded-full bg-success-50 dark:bg-success-500/10 px-2.5 py-0.5 text-theme-xs font-medium text-success-700 dark:text-success-400'
}

// The API may return a flat list or an already-nested tree. Normalize to a
// nested tree of nodes that always have a `children` array.
function buildTree(data) {
  if (!Array.isArray(data)) return []
  const looksNested = data.some(
    (n) => Array.isArray(n.children) && n.children.length > 0,
  )
  if (looksNested) {
    return data.map(normalizeNode)
  }
  const byId = new Map()
  data.forEach((n) => {
    byId.set(n.id, { ...n, children: [] })
  })
  const roots = []
  byId.forEach((node) => {
    if (node.parentId != null && byId.has(node.parentId)) {
      byId.get(node.parentId).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

function normalizeNode(n) {
  return {
    ...n,
    children: Array.isArray(n.children) ? n.children.map(normalizeNode) : [],
  }
}

function updateNode(tree, id, updater) {
  return tree.map((n) => {
    if (n.id === id) return { ...updater(n), children: n.children }
    return { ...n, children: updateNode(n.children, id, updater) }
  })
}

function addChild(tree, parentId, child) {
  return tree.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, { ...child, children: [] }] }
    }
    return { ...n, children: addChild(n.children, parentId, child) }
  })
}

function removeNode(tree, id) {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: removeNode(n.children, id) }))
}

function filterTree(nodes, query) {
  if (!query) return nodes
  const q = query.toLowerCase()
  return nodes.reduce((acc, node) => {
    const filteredChildren = filterTree(node.children, q)
    if (node.name.toLowerCase().includes(q) || filteredChildren.length > 0) {
      acc.push({ ...node, children: filteredChildren })
    }
    return acc
  }, [])
}

function TrusteeField({ trusteeId, setTrusteeId, trusteeName, setTrusteeName, label }) {
  const { t } = useTranslation('committees')
  const [suggestions, setSuggestions] = useState([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const timer = useRef(null)
  const inputRef = useRef(null)
  const inputCls = 'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

  const search = (q) => {
    setTrusteeName(q)
    setHighlightedIndex(-1)
    setTrusteeId(null)
    if (!q.trim()) { setSuggestions([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get('/api/members', { params: { firstName: q, pageSize: 20 } })
        const items = res.data?.items ?? []
        // Also search by lastName if firstName didn't yield results
        if (items.length === 0) {
          const res2 = await api.get('/api/members', { params: { lastName: q, pageSize: 20 } })
          setSuggestions(res2.data?.items ?? [])
        } else {
          setSuggestions(items)
        }
      } catch { setSuggestions([]) }
    }, 300)
  }

  const selectMember = (m) => {
    setTrusteeId(m.id)
    setTrusteeName(m.fullName ?? [m.firstName, m.lastName].filter(Boolean).join(' '))
    setSuggestions([])
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!suggestions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectMember(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setSuggestions([])
        setHighlightedIndex(-1)
        break
      default:
        break
    }
  }

  return (
    <div className="mb-4">
      <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{label || t('form.trustee', 'Trustee')}</label>
      <div className="relative">
        <input
          ref={inputRef}
          className={inputCls}
          value={trusteeName}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('form.trusteePlaceholder', 'Search member…')}
          onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-theme-md max-h-48 overflow-y-auto text-theme-sm">
            {suggestions.map((m, idx) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`w-full px-3 py-2 text-left text-gray-900 dark:text-white ${
                    idx === highlightedIndex
                      ? 'bg-brand-100 dark:bg-brand-500/20'
                      : 'hover:bg-brand-50 dark:hover:bg-brand-500/10'
                  }`}
                  onMouseDown={() => selectMember(m)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  {m.fullName ?? [m.firstName, m.lastName].filter(Boolean).join(' ')}
                  <span className="ml-2 text-theme-xs text-gray-400">{m.jmbg}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {trusteeId && (
        <button
          type="button"
          className="mt-1 text-theme-xs text-gray-400 hover:text-error-500"
          onClick={() => { setTrusteeId(null); setTrusteeName('') }}
        >
          ✕ Clear trustee
        </button>
      )}
    </div>
  )
}

function AddUnitModal({ open, parent, onClose, onSubmit, onSuccess, onError }) {
  const { t } = useTranslation('committees')
  const [name, setName] = useState('')
  const [type, setType] = useState(parent ? TYPE_MUNICIPAL : TYPE_CITY)
  const [voterCount, setVoterCount] = useState(0)
  const [trusteeId, setTrusteeId] = useState(null)
  const [trusteeName, setTrusteeName] = useState('')
  const [isTrustful, setIsTrustful] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setName('')
      setType(parent ? TYPE_MUNICIPAL : TYPE_CITY)
      setVoterCount(0)
      setTrusteeId(null)
      setTrusteeName('')
      setIsTrustful(true)
      setError(null)
    }
  }, [open, parent])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('form.nameRequired'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        type,
        voterCount: Number(voterCount) || 0,
        parentId: parent ? parent.id : null,
        trusteeId: trusteeId ?? null,
        isTrustful,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('error.saveFailed')
      setError(msg)
      onError?.(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4" data-testid="add-unit-modal">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-500 dark:text-brand-400">
            {parent ? t('modal.addChildTitle', { parentName: parent.name }) : t('modal.addRootTitle')}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              autoFocus
              data-testid="modal-name-input"
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.type')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              data-testid="modal-type-select"
            >
              <option value={TYPE_CITY}>{t('type.city')}</option>
              <option value={TYPE_MUNICIPAL}>{t('type.municipal')}</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('form.voterCount')}
            </label>
            <input
              type="number"
              min="0"
              value={voterCount}
              onChange={(e) => setVoterCount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              data-testid="modal-voter-count-input"
            />
          </div>
          <TrusteeField trusteeId={trusteeId} setTrusteeId={setTrusteeId} trusteeName={trusteeName} setTrusteeName={setTrusteeName} />
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.isTrustful', 'Trustful')}</label>
            <div className="flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit">
              {[{ value: false, label: t('common:bool.no') }, { value: true, label: t('common:bool.yes') }].map((o) => (
                <button key={String(o.value)} type="button" onClick={() => setIsTrustful(o.value)}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${isTrustful === o.value ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs' : 'text-gray-500 dark:text-gray-400'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="mb-3 text-theme-sm text-error-500" data-testid="modal-error">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              disabled={submitting}
              data-testid="modal-cancel"
            >
              {t('action.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
              disabled={submitting}
              data-testid="modal-save"
            >
              {submitting ? t('action.saving') : t('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditUnitModal({ node, onClose, onSubmit, onSuccess, onError }) {
  const { t } = useTranslation('committees')
  const [name, setName] = useState(node.name ?? '')
  const [type, setType] = useState(node.type ?? TYPE_CITY)
  const [voterCount, setVoterCount] = useState(node.voterCount ?? 0)
  const [trusteeId, setTrusteeId] = useState(node.trusteeId ?? null)
  const [trusteeName, setTrusteeName] = useState(node.trusteeName ?? '')
  const [isTrustful, setIsTrustful] = useState(node.isTrustful ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('form.nameRequired')); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ id: node.id, name: name.trim(), type, voterCount: Number(voterCount) || 0, parentId: node.parentId ?? null, trusteeId: trusteeId ?? null, trusteeName: trusteeName ?? null, isTrustful })
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || t('error.saveFailed')
      setError(msg)
      onError?.(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h3 className="text-base font-semibold text-brand-500 dark:text-brand-400">{t('modal.editTitle')}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.name')}</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.type')}</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
              <option value={TYPE_CITY}>{t('type.city')}</option>
              <option value={TYPE_MUNICIPAL}>{t('type.municipal')}</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.voterCount')}</label>
            <input type="number" min="0" value={voterCount} onChange={(e) => setVoterCount(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <TrusteeField trusteeId={trusteeId} setTrusteeId={setTrusteeId} trusteeName={trusteeName} setTrusteeName={setTrusteeName} />
          <div className="mb-4">
            <label className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('form.isTrustful', 'Trustful')}</label>
            <div className="flex gap-0.5 rounded-lg bg-gray-100 dark:bg-gray-900 p-0.5 w-fit">
              {[{ value: false, label: t('common:bool.no') }, { value: true, label: t('common:bool.yes') }].map((o) => (
                <button key={String(o.value)} type="button" onClick={() => setIsTrustful(o.value)}
                  className={`rounded-md px-2.5 py-1 text-theme-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-white ${isTrustful === o.value ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-theme-xs' : 'text-gray-500 dark:text-gray-400'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="mb-3 text-theme-sm text-error-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-theme-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              {t('action.cancel')}
            </button>
            <button type="submit" disabled={submitting}
              className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50">
              {submitting ? t('action.saving') : t('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VoterCountEditor({ node, onSave }) {
  const { t } = useTranslation('committees')
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(node.voterCount ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setValue(String(node.voterCount ?? 0))
  }, [node.voterCount])

  const commit = async () => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError(t('form.voterCountInvalid'))
      setValue(String(node.voterCount ?? 0))
      setEditing(false)
      return
    }
    if (parsed === (node.voterCount ?? 0)) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(parsed)
      setEditing(false)
    } catch (err) {
      setError(err?.response?.data?.message || t('form.saveFailed'))
      setValue(String(node.voterCount ?? 0))
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              setValue(String(node.voterCount ?? 0))
              setEditing(false)
            }
          }}
          disabled={saving}
          autoFocus
          className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          data-testid={`voter-count-input-${node.id}`}
        />
        {saving && <span className="text-theme-xs text-gray-500 dark:text-gray-400">{t('action.saving')}</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={t('form.voterCountTooltip')}
      className="rounded-lg px-2 py-1 text-theme-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
      data-testid={`voter-count-display-${node.id}`}
    >
      {node.voterCount ?? 0}
      {error && <span className="ml-2 text-theme-xs text-error-500">{error}</span>}
    </button>
  )
}

function TableRow({
  node,
  onAddChild,
  onEdit,
  onSaveVoterCount,
  onDelete,
}) {
  const { t, i18n } = useTranslation('committees')
  const memberCount = node.memberCount ?? node.members?.length ?? 0

  const getTrustfulIcon = () => {
    if (node.isTrustful) {
      return (
        <svg className="h-5 w-5 text-success-500 dark:text-success-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-label="Yes">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }
    return (
      <svg className="h-5 w-5 text-error-500 dark:text-error-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-label="No">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }

  return (
    <tr data-testid={`org-unit-row-${node.id}`} key={node.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
      <td className="px-4 py-3 text-center w-20">
        <span className={typeBadgeClass(node.type)}>{t(`type.${node.type.toLowerCase()}`)}</span>
      </td>
      <td className="px-4 py-3 text-theme-sm font-medium text-gray-900 dark:text-white">{node.name}</td>
      <td className="px-4 py-3 flex items-center justify-center">
        {getTrustfulIcon()}
      </td>
      <td className="px-4 py-3 text-theme-sm text-gray-700 dark:text-gray-300">
        {node.trusteeName ? node.trusteeName : '—'}
      </td>
      <td className="px-4 py-3 text-right text-theme-sm text-gray-700 dark:text-gray-300">
        <VoterCountEditor
          node={node}
          onSave={(v) => onSaveVoterCount(node, v)}
        />
      </td>
      <td className="px-4 py-3 text-right text-theme-sm text-gray-700 dark:text-gray-300">{memberCount}</td>
      <td className="px-4 py-3">
        <PromilleBar pm={computePromille(node)} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {node.type !== TYPE_MUNICIPAL && (
            <button
              type="button"
              onClick={() => onAddChild(node)}
              className="rounded-md border border-gray-200 dark:border-gray-800 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              data-testid={`add-child-btn-${node.id}`}
            >
              {t('action.addChild')}
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid={`edit-btn-${node.id}`}
          >
            {t('action.edit')}
          </button>
          {!node.children?.length && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="rounded-md border border-error-200 dark:border-error-700 px-2.5 py-1 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10"
              data-testid={`delete-btn-${node.id}`}
            >
              {t('action.delete')}
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

function CommitteesMap({ rows }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    if (instanceRef.current) {
      instanceRef.current.remove()
      instanceRef.current = null
    }

    const map = L.map(mapRef.current, { zoomControl: true }).setView([44.0, 21.0], 7)
    instanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    const withCoords = rows.filter((r) => r.lat != null && r.lng != null)

    // Compute promille for sizing
    const pms = withCoords.map((r) => computePromille(r))
    const maxPm = Math.max(...pms.filter((v) => v > 0), 0.001)
    const minPm = Math.min(...pms.filter((v) => v > 0), maxPm)

    withCoords.forEach((r) => {
      const pm = computePromille(r)
      const pmStr = pm.toFixed(2) + '‰'
      const r2 = pm > 0 && maxPm > minPm
        ? 6 + ((pm - minPm) / (maxPm - minPm)) * 20
        : 6
      const color = barColor(pm)

      const marker = L.circleMarker([r.lat, r.lng], {
        radius: r2,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.55,
      })

      marker.bindTooltip(
        `<strong>${r.name}</strong><br/>` +
        `${r.memberCount} чланова · <b>${pmStr}</b>` +
        (r.voterCount > 0 ? `<br/><span style="color:#aaa">${r.voterCount.toLocaleString()} бирача</span>` : ''),
        { direction: 'top', className: 'membership-map-tooltip' }
      )
      marker.addTo(map)
    })

    return () => {
      map.remove()
      instanceRef.current = null
    }
  }, [rows])

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: 'calc(100vh - 260px)', minHeight: 420 }} />
      <style>{`.membership-map-tooltip { font-size: 13px; padding: 6px 10px; border: none; box-shadow: 0 2px 8px rgba(0,0,0,.15); }`}</style>
    </div>
  )
}

function IconTable() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

export default function Committees() {
  const { t } = useTranslation(['committees', 'common'])
  const toast = useToast()
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [modal, setModal] = useState({ open: false, parent: null })
  const [editModal, setEditModal] = useState(null) // node | null
  const [filterName, setFilterName] = useState('')
  const [filterEngagement, setFilterEngagement] = useState(new Set()) // Set of 'low' | 'medium' | 'high'
  const [filterTrustful, setFilterTrustful] = useState(false)
  const [sortPm, setSortPm] = useState(null) // null | 'asc' | 'desc'
  const [view, setView] = useState('table') // 'table' | 'map'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/committees')
      setTree(buildTree(res.data))
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('committees:state.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  const handleAddChild = useCallback((parent) => {
    setModal({ open: true, parent })
  }, [])

  const handleEdit = useCallback((node) => {
    setEditModal(node)
  }, [])

  const handleSaveEdit = useCallback(async (payload) => {
    await api.put(`/api/committees/${payload.id}`, payload)
    setTree((prev) =>
      updateNode(prev, payload.id, (n) => ({ ...n, name: payload.name, type: payload.type, voterCount: payload.voterCount, trusteeId: payload.trusteeId, trusteeName: payload.trusteeName, isTrustful: payload.isTrustful }))
    )
  }, [])

  const handleAddRoot = useCallback(() => {
    setModal({ open: true, parent: null })
  }, [])

  const handleCreate = useCallback(
    async (payload) => {
      const res = await api.post('/api/committees', payload)
      const created = res.data
      setTree((prev) => {
        if (payload.parentId == null) {
          return [...prev, { ...created, children: [] }]
        }
        return addChild(prev, payload.parentId, created)
      })
    },
    [],
  )

  const handleSaveVoterCount = useCallback(async (node, newVoterCount) => {
    const payload = {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parentId ?? null,
      voterCount: newVoterCount,
      trusteeId: node.trusteeId ?? null,
      isTrustful: node.isTrustful ?? true,
    }
    await api.put(`/api/committees/${node.id}`, payload)
    setTree((prev) =>
      updateNode(prev, node.id, (n) => ({ ...n, voterCount: newVoterCount })),
    )
    toast.success(t('committees:toast.voterCountSaved'))
  }, [toast, t])

  const handleDelete = useCallback(async (node) => {
    if (!window.confirm(t('committees:action.deleteConfirm'))) return
    setDeleteError(null)
    try {
      await api.delete(`/api/committees/${node.id}`)
      setTree((prev) => removeNode(prev, node.id))
      toast.success(t('committees:toast.deleted'))
    } catch (err) {
      const msg = err?.response?.status === 409
        ? t('committees:error.deleteRestricted')
        : err?.response?.data?.message || err?.message || t('committees:error.deleteFailed')
      setDeleteError(msg)
      toast.error(msg)
    }
  }, [t, toast])

  // Flatten tree for table display
  const flattenedRows = useMemo(() => {
    const rows = []
    function flatten(nodes) {
      for (const node of nodes) {
        rows.push(node)
        if (node.children?.length) flatten(node.children)
      }
    }
    flatten(tree)
    return rows
  }, [tree])

  const visibleRows = useMemo(() => {
    let rows = flattenedRows
    if (filterName.trim()) {
      const matches = makeScriptMatcher(filterName.trim())
      rows = rows.filter(n => matches(n.name))
    }
    if (filterEngagement.size > 0) {
      rows = rows.filter(n => {
        const pm = computePromille(n)
        if (filterEngagement.has('high') && pm >= 1) return true
        if (filterEngagement.has('medium') && pm >= 0.8 && pm < 1) return true
        if (filterEngagement.has('low') && pm < 0.8) return true
        return false
      })
    }
    if (filterTrustful) rows = rows.filter(n => !n.isTrustful)
    return rows
  }, [flattenedRows, filterName, filterEngagement, filterTrustful])

  const sortedRows = useMemo(() => {
    if (!sortPm) return visibleRows
    return [...visibleRows].sort((a, b) => {
      const val = sortPm.key === 'pm'
        ? computePromille(a) - computePromille(b)
        : sortPm.key === 'name'
          ? a.name.localeCompare(b.name, 'sr')
          : (a.voterCount ?? 0) - (b.voterCount ?? 0)
      return sortPm.dir === 'asc' ? val : -val
    })
  }, [visibleRows, sortPm])

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400" data-testid="org-units-loading">{t('common:state.loading')}</p>
    }
    if (error) {
      return <p className="text-theme-sm text-error-500" data-testid="org-units-error">{error}</p>
    }
    if (tree.length === 0) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('committees:state.noOrgUnits')}</p>
    }
    if (visibleRows.length === 0) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('committees:filter.noResults')}</p>
    }

    const SortTh = ({ colKey, label, currentSort, onSort, className = '' }) => {
      const active = currentSort?.key === colKey
      const icon = active ? (currentSort.dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'
      return (
        <th
          className={`px-4 py-3 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 ${active ? 'text-brand-500 dark:text-brand-400' : ''} ${className}`}
          onClick={() => onSort(colKey)}
        >
          {label}<span className="ml-0.5 text-theme-xs opacity-60">{icon}</span>
        </th>
      )
    }

    const handleSort = (key) => {
      setSortPm(prev => {
        if (!prev || prev.key !== key) return { key, dir: 'desc' }
        if (prev.dir === 'desc') return { key, dir: 'asc' }
        return null
      })
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" data-testid="org-units-table">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-theme-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-center w-20">{t('form.type')}</th>
              <SortTh colKey="name" label={t('form.name')} currentSort={sortPm} onSort={handleSort} className="text-left" />
              <th className="px-4 py-3 text-center">{t('form.isTrustful')}</th>
              <th className="px-4 py-3">{t('form.trustee')}</th>
              <SortTh colKey="voterCount" label={t('form.voterCount')} currentSort={sortPm} onSort={handleSort} className="text-right" />
              <th className="px-4 py-3 text-right">{t('stats.members')}</th>
              <SortTh colKey="pm" label={t('stats.membership')} currentSort={sortPm} onSort={handleSort} className="text-center" />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((node) => (
              <TableRow
                key={node.id}
                node={node}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onSaveVoterCount={handleSaveVoterCount}
                onDelete={handleDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [loading, error, tree, visibleRows, sortedRows, sortPm, handleAddChild, handleEdit, handleSaveVoterCount, handleDelete, t])

  return (
    <div>
      <ToastContainer toasts={toast.toasts} dismiss={toast.dismiss} />
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('committees:title')}</h2>
          <button
            type="button"
            onClick={handleAddRoot}
            className="inline-flex items-center rounded-md bg-brand-500 hover:bg-brand-600 px-2.5 py-1 text-theme-xs font-medium text-white"
            data-testid="add-root-unit-btn"
          >
            {t('action.addRoot')}
          </button>
        </div>

        {/* Filter bar */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1 min-w-[160px]">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder={t('committees:filter.namePlaceholder')}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-1.5 pl-9 pr-9 text-theme-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
            />
            {filterName && (
              <button
                type="button"
                onClick={() => setFilterName('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear filter"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { key: 'high',   label: t('committees:filter.high'),   color: '#4ABEA0' },
              { key: 'medium', label: t('committees:filter.medium'), color: '#f79009' },
              { key: 'low',    label: t('committees:filter.low'),    color: '#f04438' },
            ].map(({ key, label, color }) => {
              const active = filterEngagement.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterEngagement(prev => {
                    const next = new Set(prev)
                    next.has(key) ? next.delete(key) : next.add(key)
                    return next
                  })}
                  style={active ? { background: color, borderColor: color, color: '#fff' } : {}}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-theme-xs font-medium border transition-colors
                    ${active
                      ? ''
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                >
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: active ? '#fff' : color }} />
                  {label}
                </button>
              )
            })}
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={filterTrustful}
              onClick={() => setFilterTrustful(v => !v)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${filterTrustful ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${filterTrustful ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-theme-xs font-medium text-gray-600 dark:text-gray-300">{t('committees:filter.onlyTrustees')}</span>
          </label>
          <div className="ml-auto flex gap-0.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
            <button
              type="button"
              onClick={() => setView('table')}
              title="Table view"
              className={`rounded-md p-1 transition-colors ${view === 'table' ? 'bg-brand-50 dark:bg-gray-700 text-brand-500 shadow-theme-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <IconTable />
            </button>
            <button
              type="button"
              onClick={() => setView('map')}
              title="Map view"
              className={`rounded-md p-1 transition-colors ${view === 'map' ? 'bg-brand-50 dark:bg-gray-700 text-brand-500 shadow-theme-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <IconMap />
            </button>
          </div>
        </div>

        {deleteError && (
          <p className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400 m-6">
            {deleteError}
          </p>
        )}
        {view === 'map' ? (
          loading
            ? <p className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</p>
            : error
              ? <p className="p-6 text-theme-sm text-error-500">{error}</p>
              : <CommitteesMap rows={visibleRows} />
        ) : (
          content
        )}
      </div>

      <AddUnitModal
        open={modal.open}
        parent={modal.parent}
        onClose={() => setModal({ open: false, parent: null })}
        onSubmit={handleCreate}
        onSuccess={() => toast.success(t('committees:toast.created'))}
        onError={(msg) => toast.error(msg)}
      />

      {editModal && (
        <EditUnitModal
          node={editModal}
          onClose={() => setEditModal(null)}
          onSubmit={handleSaveEdit}
          onSuccess={() => toast.success(t('committees:toast.saved'))}
          onError={(msg) => toast.error(msg)}
        />
      )}
    </div>
  )
}
