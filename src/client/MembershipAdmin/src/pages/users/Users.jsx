import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import api from '../../framework/api'

const ROLES = ['SuperAdmin', 'Admin', 'LocalAdmin', 'Operator', 'Viewer']
const ROLES_REQUIRING_ORG_UNIT = ['LocalAdmin', 'Operator', 'Viewer']

function flattenOrgUnits(units, depth = 0, acc = []) {
  if (!Array.isArray(units)) return acc
  for (const u of units) {
    acc.push({ id: u.id, name: u.name, depth })
    if (u.children && u.children.length) flattenOrgUnits(u.children, depth + 1, acc)
  }
  return acc
}

function extractErrorMessages(err) {
  const data = err?.response?.data
  if (!data) return [err?.message || 'Request failed.']
  if (typeof data === 'string') return [data]
  if (data.message) return [data.message]
  if (data.title && !data.errors) return [data.title]
  if (data.errors && typeof data.errors === 'object') {
    const msgs = []
    for (const k of Object.keys(data.errors)) {
      const v = data.errors[k]
      if (Array.isArray(v)) msgs.push(...v)
      else if (typeof v === 'string') msgs.push(v)
    }
    if (msgs.length) return msgs
  }
  return ['Request failed.']
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [orgUnits, setOrgUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // user object or null
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const orgUnitOptions = useMemo(() => flattenOrgUnits(orgUnits), [orgUnits])
  const orgUnitNameById = useMemo(() => {
    const map = new Map()
    for (const o of orgUnitOptions) map.set(o.id, o.name)
    return map
  }, [orgUnitOptions])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [usersRes, orgRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/orgunits'),
      ])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.items || [])
      setOrgUnits(Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.items || [])
    } catch (err) {
      setLoadError(extractErrorMessages(err).join(' '))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      await loadUsers()
    } catch (err) {
      setDeleteError(extractErrorMessages(err).join(' '))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Users</h1>
          <p className="mt-1 text-sm text-body">Manage admin and operator accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          Create user
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default">
        {loading ? (
          <div className="p-6 text-sm text-body">Loading…</div>
        ) : loadError ? (
          <div className="m-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
            {loadError}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-body">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left">
                  <th className="py-4 px-4 text-sm font-medium text-black">Email</th>
                  <th className="py-4 px-4 text-sm font-medium text-black">Role</th>
                  <th className="py-4 px-4 text-sm font-medium text-black">Org Unit</th>
                  <th className="py-4 px-4 text-right text-sm font-medium text-black">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-stroke">
                    <td className="py-3 px-4 text-sm text-black">{u.email}</td>
                    <td className="py-3 px-4 text-sm text-black">{u.role}</td>
                    <td className="py-3 px-4 text-sm text-black">
                      {u.orgUnitId ? orgUnitNameById.get(u.orgUnitId) || `#${u.orgUnitId}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => setEditTarget(u)}
                        className="mr-3 cursor-pointer text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(u)
                        }}
                        className="cursor-pointer text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createOpen && (
        <CreateUserModal
          orgUnitOptions={orgUnitOptions}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false)
            await loadUsers()
          }}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          orgUnitOptions={orgUnitOptions}
          onClose={() => setEditTarget(null)}
          onSaved={async () => {
            setEditTarget(null)
            await loadUsers()
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete user"
          message={`Delete user "${deleteTarget.email}"? This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          confirmDisabled={deleting}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onConfirm={handleConfirmDelete}
          error={deleteError}
        />
      )}
    </div>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-lg rounded-sm border border-stroke bg-white shadow-default">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
          <h2 className="text-lg font-semibold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-body hover:text-black"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CreateUserModal({ orgUnitOptions, onClose, onCreated }) {
  const [serverErrors, setServerErrors] = useState([])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: '', password: '', role: 'Viewer', orgUnitId: '' },
  })
  const role = watch('role')
  const orgUnitRequired = ROLES_REQUIRING_ORG_UNIT.includes(role)

  const onSubmit = async (values) => {
    setServerErrors([])
    const payload = {
      email: values.email,
      password: values.password,
      role: values.role,
      orgUnitId: values.orgUnitId ? Number(values.orgUnitId) : null,
    }
    try {
      await api.post('/api/users', payload)
      await onCreated()
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setServerErrors(['A user with this email already exists.'])
      } else if (status === 400) {
        setServerErrors(extractErrorMessages(err))
      } else {
        setServerErrors(extractErrorMessages(err))
      }
    }
  }

  return (
    <ModalShell title="Create user" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">Email</label>
          <input
            type="email"
            autoComplete="off"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          />
          {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">Role</label>
          <select
            {...register('role', { required: 'Role is required' })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-danger">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">
            Org Unit{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || 'Org Unit is required for this role',
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            <option value="">— None —</option>
            {orgUnitOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {' '.repeat(o.depth * 2)}
                {o.name}
              </option>
            ))}
          </select>
          {errors.orgUnitId && (
            <p className="mt-1 text-sm text-danger">{errors.orgUnitId.message}</p>
          )}
        </div>

        {serverErrors.length > 0 && (
          <div className="mb-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
            <ul className="list-disc pl-4">
              {serverErrors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-sm border border-stroke py-2 px-4 text-sm text-black hover:bg-gray-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditUserModal({ user, orgUnitOptions, onClose, onSaved }) {
  const [serverErrors, setServerErrors] = useState([])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      role: user.role || 'Viewer',
      orgUnitId: user.orgUnitId != null ? String(user.orgUnitId) : '',
    },
  })
  const role = watch('role')
  const orgUnitRequired = ROLES_REQUIRING_ORG_UNIT.includes(role)

  const onSubmit = async (values) => {
    setServerErrors([])
    const payload = {
      role: values.role,
      orgUnitId: values.orgUnitId ? Number(values.orgUnitId) : null,
    }
    try {
      await api.put(`/api/users/${user.id}`, payload)
      await onSaved()
    } catch (err) {
      const status = err?.response?.status
      if (status === 409) {
        setServerErrors(['A user with this email already exists.'])
      } else {
        setServerErrors(extractErrorMessages(err))
      }
    }
  }

  return (
    <ModalShell title={`Edit user — ${user.email}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">Role</label>
          <select
            {...register('role', { required: 'Role is required' })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-danger">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-black">
            Org Unit{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || 'Org Unit is required for this role',
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            <option value="">— None —</option>
            {orgUnitOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {' '.repeat(o.depth * 2)}
                {o.name}
              </option>
            ))}
          </select>
          {errors.orgUnitId && (
            <p className="mt-1 text-sm text-danger">{errors.orgUnitId.message}</p>
          )}
        </div>

        {serverErrors.length > 0 && (
          <div className="mb-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
            <ul className="list-disc pl-4">
              {serverErrors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-sm border border-stroke py-2 px-4 text-sm text-black hover:bg-gray-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ConfirmModal({ title, message, confirmLabel, confirmDisabled, onCancel, onConfirm, error }) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p className="mb-4 text-sm text-black">{message}</p>
      {error && (
        <div className="mb-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-sm border border-stroke py-2 px-4 text-sm text-black hover:bg-gray-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="cursor-pointer rounded-sm border border-danger bg-danger py-2 px-4 text-sm text-white hover:bg-opacity-90 disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
