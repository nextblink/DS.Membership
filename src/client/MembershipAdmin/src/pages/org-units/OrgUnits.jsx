// Org Units tree page — SuperAdmin only (route enforces role).
//
// Renders the OrgUnit hierarchy (City -> Municipal) from GET /api/orgunits.
// Supports inline VoterCount edit, add-root, add-child, and leaf delete.
import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../framework/api'

const TYPE_CITY = 'City'
const TYPE_MUNICIPAL = 'Municipal'

function typeBadgeClass(type) {
  if (type === TYPE_CITY) {
    return 'inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'
  }
  return 'inline-flex rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success'
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

function AddUnitModal({ open, parent, onClose, onSubmit }) {
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
      setError('Name is required')
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
      setError(err?.response?.data?.message || err?.message || 'Failed to create unit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="add-unit-modal">
      <div className="w-full max-w-md rounded-sm border border-stroke bg-white shadow-default">
        <div className="border-b border-stroke px-6 py-4">
          <h3 className="text-lg font-semibold text-black">
            {parent ? `Add child unit under "${parent.name}"` : 'Add root unit'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-black">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary"
              autoFocus
              data-testid="modal-name-input"
            />
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-black">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary"
              data-testid="modal-type-select"
            >
              <option value={TYPE_CITY}>City</option>
              <option value={TYPE_MUNICIPAL}>Municipal</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-black">
              Voter Count
            </label>
            <input
              type="number"
              min="0"
              value={voterCount}
              onChange={(e) => setVoterCount(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary"
              data-testid="modal-voter-count-input"
            />
          </div>
          {error && (
            <p className="mb-3 text-sm text-danger" data-testid="modal-error">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-stroke px-4 py-2 text-sm font-medium text-black hover:bg-gray-50"
              disabled={submitting}
              data-testid="modal-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              disabled={submitting}
              data-testid="modal-save"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function VoterCountEditor({ node, onSave }) {
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
      setError('Invalid number')
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
      setError(err?.response?.data?.message || 'Save failed')
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
          className="w-24 rounded border border-stroke bg-white px-2 py-0.5 text-sm outline-none focus:border-primary"
          data-testid={`voter-count-input-${node.id}`}
        />
        {saving && <span className="text-xs text-body">saving...</span>}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to edit voter count"
      className="rounded px-2 py-0.5 text-sm text-black hover:bg-gray-100"
      data-testid={`voter-count-display-${node.id}`}
    >
      {node.voterCount ?? 0}
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
    </button>
  )
}

function TreeNode({
  node,
  depth,
  onAddChild,
  onSaveVoterCount,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const memberCount = node.memberCount ?? node.members?.length ?? 0

  return (
    <li data-testid={`org-unit-node-${node.id}`} data-node-name={node.name}>
      <div
        className="flex flex-wrap items-center gap-3 rounded border border-stroke bg-white px-3 py-2 hover:bg-gray-50"
        style={{ marginLeft: depth * 24 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded text-sm text-body hover:bg-gray-100 disabled:opacity-30"
          disabled={!hasChildren}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : '•'}
        </button>

        <span className="font-medium text-black" data-testid={`node-name-${node.id}`}>{node.name}</span>
        <span className={typeBadgeClass(node.type)}>{node.type}</span>

        <span className="text-sm text-body">
          Voters:{' '}
          <VoterCountEditor
            node={node}
            onSave={(v) => onSaveVoterCount(node, v)}
          />
        </span>

        <span className="text-sm text-body">Members: {memberCount}</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddChild(node)}
            className="rounded border border-stroke px-3 py-1 text-xs font-medium text-black hover:bg-gray-50"
            data-testid={`add-child-btn-${node.id}`}
          >
            + Add child unit
          </button>
          {!hasChildren && (
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="rounded border border-danger px-3 py-1 text-xs font-medium text-danger hover:bg-danger hover:text-white"
              data-testid={`delete-btn-${node.id}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="mt-2 flex flex-col gap-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onSaveVoterCount={onSaveVoterCount}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function OrgUnits() {
  const [tree, setTree] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState({ open: false, parent: null })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/orgunits')
      setTree(buildTree(res.data))
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load org units')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleAddChild = useCallback((parent) => {
    setModal({ open: true, parent })
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
    if (!window.confirm(`Delete "${node.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/api/orgunits/${node.id}`)
      setTree((prev) => removeNode(prev, node.id))
    } catch (err) {
      if (err?.response?.status === 409) {
        window.alert('Cannot delete unit with children')
      } else {
        window.alert(
          err?.response?.data?.message || err?.message || 'Failed to delete unit',
        )
      }
    }
  }, [])

  const content = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-body" data-testid="org-units-loading">Loading...</p>
    }
    if (error) {
      return <p className="text-sm text-danger" data-testid="org-units-error">{error}</p>
    }
    if (tree.length === 0) {
      return <p className="text-sm text-body">No org units yet. Click "Add root unit" to create one.</p>
    }
    return (
      <ul className="flex flex-col gap-2" data-testid="org-units-tree">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            onAddChild={handleAddChild}
            onSaveVoterCount={handleSaveVoterCount}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    )
  }, [loading, error, tree, handleAddChild, handleSaveVoterCount, handleDelete])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-black">Org Units</h2>
        <button
          type="button"
          onClick={handleAddRoot}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
          data-testid="add-root-unit-btn"
        >
          + Add root unit
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default">
        {content}
      </div>

      <AddUnitModal
        open={modal.open}
        parent={modal.parent}
        onClose={() => setModal({ open: false, parent: null })}
        onSubmit={handleCreate}
      />
    </div>
  )
}
