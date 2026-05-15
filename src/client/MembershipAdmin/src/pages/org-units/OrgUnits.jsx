// Org Units tree page — SuperAdmin only (route enforces role).
//
// Renders the OrgUnit hierarchy (City -> Municipal) from GET /api/orgunits.
// Supports inline VoterCount edit, add-root, add-child, and leaf delete.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

const TYPE_CITY = 'City'
const TYPE_MUNICIPAL = 'Municipal'

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

function AddUnitModal({ open, parent, onClose, onSubmit }) {
  const { t } = useTranslation('orgUnits')
  const [name, setName] = useState('')
  const [type, setType] = useState(parent ? TYPE_MUNICIPAL : TYPE_CITY)
  const [voterCount, setVoterCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      setName('')
      setType(parent ? TYPE_MUNICIPAL : TYPE_CITY)
      setVoterCount(0)
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
      })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('error.saveFailed'))
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

function EditUnitModal({ node, onClose, onSubmit }) {
  const { t } = useTranslation('orgUnits')
  const [name, setName] = useState(node.name ?? '')
  const [type, setType] = useState(node.type ?? TYPE_CITY)
  const [voterCount, setVoterCount] = useState(node.voterCount ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setError(t('form.nameRequired')); return }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ id: node.id, name: name.trim(), type, voterCount: Number(voterCount) || 0, parentId: node.parentId ?? null })
      onClose()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('error.saveFailed'))
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
  const { t } = useTranslation('orgUnits')
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

function TreeNode({
  node,
  depth,
  onAddChild,
  onEdit,
  onSaveVoterCount,
  onDelete,
  forceExpand = false,
}) {
  const { t } = useTranslation('orgUnits')
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = forceExpand || expanded
  const memberCount = node.memberCount ?? node.members?.length ?? 0

  return (
    <li data-testid={`org-unit-node-${node.id}`} data-node-name={node.name}>
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        style={{ marginLeft: depth * 24 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-theme-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          disabled={!hasChildren}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
        </button>

        <span className="font-medium text-gray-900 dark:text-white" data-testid={`node-name-${node.id}`}>{node.name}</span>
        <span className={typeBadgeClass(node.type)}>{node.type}</span>

        <span className="text-theme-sm text-gray-500 dark:text-gray-400">
          {t('stats.voters')}:{' '}
          <VoterCountEditor
            node={node}
            onSave={(v) => onSaveVoterCount(node, v)}
          />
        </span>

        <span className="text-theme-sm text-gray-500 dark:text-gray-400">{t('stats.members')}: {memberCount}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(node)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid={`edit-btn-${node.id}`}
          >
            {t('action.edit')}
          </button>
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 text-theme-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            data-testid={`add-child-btn-${node.id}`}
          >
            {t('action.addChild')}
          </button>
          {!hasChildren && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="rounded-lg border border-error-300 dark:border-error-700 px-3 py-1.5 text-theme-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-500 hover:text-white"
              data-testid={`delete-btn-${node.id}`}
            >
              {t('action.delete')}
            </button>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onSaveVoterCount={onSaveVoterCount}
              onDelete={onDelete}
              forceExpand={forceExpand}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function OrgUnits() {
  const { t } = useTranslation(['orgUnits', 'common'])
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [modal, setModal] = useState({ open: false, parent: null })
  const [editModal, setEditModal] = useState(null) // node | null
  const [filterName, setFilterName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/orgunits')
      setTree(buildTree(res.data))
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('orgUnits:state.loadFailed'))
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
    await api.put(`/api/orgunits/${payload.id}`, payload)
    setTree((prev) =>
      updateNode(prev, payload.id, (n) => ({ ...n, name: payload.name, type: payload.type, voterCount: payload.voterCount }))
    )
  }, [])

  const handleAddRoot = useCallback(() => {
    setModal({ open: true, parent: null })
  }, [])

  const handleCreate = useCallback(
    async (payload) => {
      const res = await api.post('/api/orgunits', payload)
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
    }
    await api.put(`/api/orgunits/${node.id}`, payload)
    setTree((prev) =>
      updateNode(prev, node.id, (n) => ({ ...n, voterCount: newVoterCount })),
    )
  }, [])

  const handleDelete = useCallback(async (node) => {
    if (!window.confirm(t('orgUnits:action.deleteConfirm'))) return
    setDeleteError(null)
    try {
      await api.delete(`/api/orgunits/${node.id}`)
      setTree((prev) => removeNode(prev, node.id))
    } catch (err) {
      if (err?.response?.status === 409) {
        setDeleteError(t('orgUnits:error.deleteRestricted'))
      } else {
        setDeleteError(err?.response?.data?.message || err?.message || t('orgUnits:error.deleteFailed'))
      }
    }
  }, [t])

  const visibleTree = useMemo(() => filterTree(tree, filterName.trim()), [tree, filterName])

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400" data-testid="org-units-loading">{t('common:state.loading')}</p>
    }
    if (error) {
      return <p className="text-theme-sm text-error-500" data-testid="org-units-error">{error}</p>
    }
    if (tree.length === 0) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('orgUnits:state.noOrgUnits')}</p>
    }
    if (visibleTree.length === 0) {
      return <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('orgUnits:filter.noResults')}</p>
    }
    return (
      <ul className="flex flex-col gap-2" data-testid="org-units-tree">
        {visibleTree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            onAddChild={handleAddChild}
            onEdit={handleEdit}
            onSaveVoterCount={handleSaveVoterCount}
            onDelete={handleDelete}
            forceExpand={!!filterName.trim()}
          />
        ))}
      </ul>
    )
  }, [loading, error, tree, visibleTree, filterName, handleAddChild, handleEdit, handleSaveVoterCount, handleDelete, t])

  return (
    <div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('orgUnits:title')}</h2>
          <button
            type="button"
            onClick={handleAddRoot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
            data-testid="add-root-unit-btn"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('action.addRoot')}
          </button>
        </div>

        {/* Filter bar */}
        <div className="border-b border-gray-200 dark:border-gray-800 bg-brand-50 dark:bg-brand-500/[0.06] px-6 py-3">
          <div className="relative max-w-sm">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder={t('orgUnits:filter.namePlaceholder')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-9 pr-9 text-theme-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
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
        </div>

        <div className="p-6">
          {deleteError && (
            <p className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
              {deleteError}
            </p>
          )}
          {content}
        </div>
      </div>

      <AddUnitModal
        open={modal.open}
        parent={modal.parent}
        onClose={() => setModal({ open: false, parent: null })}
        onSubmit={handleCreate}
      />

      {editModal && (
        <EditUnitModal
          node={editModal}
          onClose={() => setEditModal(null)}
          onSubmit={handleSaveEdit}
        />
      )}
    </div>
  )
}
