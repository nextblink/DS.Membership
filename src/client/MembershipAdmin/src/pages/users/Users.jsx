import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

const ROLES = ['SuperAdmin', 'Admin', 'LocalAdmin', 'Operator', 'Viewer']
const ROLES_REQUIRING_ORG_UNIT = ['LocalAdmin', 'Operator', 'Viewer']

const ROLE_KEY = {
  SuperAdmin: 'superAdmin',
  Admin: 'admin',
  LocalAdmin: 'localAdmin',
  Operator: 'operator',
  Viewer: 'viewer',
}

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
  const { t } = useTranslation(['users', 'enums', 'common'])
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
          <h1 className="text-2xl font-semibold text-black">{t('users:title')}</h1>
          <p className="mt-1 text-sm text-body">Manage admin and operator accounts.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          {t('users:addUser')}
        </button>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default">
        {loading ? (
          <div className="p-6 text-sm text-body">{t('common:state.loading')}</div>
        ) : loadError ? (
          <div className="m-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
            {loadError}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-body">{t('users:state.noUsers')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left">
                  <th className="py-4 px-4 text-sm font-medium text-black">{t('users:table.email')}</th>
                  <th className="py-4 px-4 text-sm font-medium text-black">{t('users:table.role')}</th>
                  <th className="py-4 px-4 text-sm font-medium text-black">{t('users:table.orgUnit')}</th>
                  <th className="py-4 px-4 text-right text-sm font-medium text-black">{t('users:table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-stroke">
                    <td className="py-3 px-4 text-sm text-black">{u.email}</td>
                    <td className="py-3 px-4 text-sm text-black">
                      {t(`enums:role.${ROLE_KEY[u.role] || u.role}`)}
                    </td>
                    <td className="py-3 px-4 text-sm text-black">
                      {u.orgUnitId ? orgUnitNameById.get(u.orgUnitId) || `#${u.orgUnitId}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm">
                      <button
                        type="button"
                        onClick={() => setEditTarget(u)}
                        className="mr-3 cursor-pointer text-primary hover:underline"
                      >
                        {t('users:action.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(u)
                        }}
                        className="cursor-pointer text-danger hover:underline"
                      >
                        {t('users:action.delete')}
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
          title={t('users:action.delete')}
          message={`${t('users:confirm.delete')} "${deleteTarget.email}"`}
          confirmLabel={deleting ? t('users:action.deleting') : t('users:action.delete')}
          confirmDisabled={deleting}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onConfirm={handleConfirmDelete}
          error={deleteError}
          cancelLabel={t('users:action.cancel')}
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
  const { t } = useTranslation(['users', 'enums'])
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
        setServerErrors([t('users:error.createFailed')])
      } else if (status === 400) {
        setServerErrors(extractErrorMessages(err))
      } else {
        setServerErrors(extractErrorMessages(err))
      }
    }
  }

  return (
    <ModalShell title={t('users:modal.addTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="create-user-form">
        <div className="mb-4">
          <label htmlFor="create-email" className="mb-2 block text-sm font-medium text-black">{t('users:form.email')}</label>
          <input
            id="create-email"
            type="email"
            autoComplete="off"
            {...register('email', {
              required: t('users:validation.emailRequired'),
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' },
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          />
          {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="create-password" className="mb-2 block text-sm font-medium text-black">{t('users:form.password')}</label>
          <input
            id="create-password"
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: t('users:validation.passwordRequired'),
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="create-role" className="mb-2 block text-sm font-medium text-black">{t('users:form.role')}</label>
          <select
            id="create-role"
            {...register('role', { required: t('users:validation.roleRequired') })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`enums:role.${ROLE_KEY[r] || r}`)}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-danger">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="create-orgUnitId" className="mb-2 block text-sm font-medium text-black">
            {t('users:form.orgUnit')}{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            id="create-orgUnitId"
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || t('users:form.selectOrgUnit'),
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            <option value="">{t('users:form.noOrgUnit')}</option>
            {orgUnitOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {' '.repeat(o.depth * 2)}
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
            {t('users:action.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('users:action.saving') : t('users:action.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditUserModal({ user, orgUnitOptions, onClose, onSaved }) {
  const { t } = useTranslation(['users', 'enums'])
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
        setServerErrors([t('users:error.saveFailed')])
      } else {
        setServerErrors(extractErrorMessages(err))
      }
    }
  }

  return (
    <ModalShell title={`${t('users:modal.editTitle')} — ${user.email}`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="edit-user-form">
        <div className="mb-4">
          <label htmlFor="edit-role" className="mb-2 block text-sm font-medium text-black">{t('users:form.role')}</label>
          <select
            id="edit-role"
            {...register('role', { required: t('users:validation.roleRequired') })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`enums:role.${ROLE_KEY[r] || r}`)}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-sm text-danger">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="edit-orgUnitId" className="mb-2 block text-sm font-medium text-black">
            {t('users:form.orgUnit')}{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            id="edit-orgUnitId"
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || t('users:form.selectOrgUnit'),
            })}
            className="w-full rounded-sm border border-stroke bg-transparent py-2.5 px-3 text-black outline-none focus:border-primary"
          >
            <option value="">{t('users:form.noOrgUnit')}</option>
            {orgUnitOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {' '.repeat(o.depth * 2)}
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
            {t('users:action.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-primary bg-primary py-2 px-4 text-sm text-white hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('users:action.saving') : t('users:action.save')}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function ConfirmModal({ title, message, confirmLabel, confirmDisabled, onCancel, onConfirm, error, cancelLabel }) {
  const { t } = useTranslation('users')
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
          {cancelLabel || t('action.cancel')}
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
