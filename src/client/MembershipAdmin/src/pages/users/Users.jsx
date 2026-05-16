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
  const [nameFilter, setNameFilter] = useState('')
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

  const loadUsers = useCallback(async (name) => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = {}
      if (name && name.trim()) params.name = name.trim()
      const [usersRes, orgRes] = await Promise.all([
        api.get('/api/users', { params }),
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
    loadUsers(nameFilter)
  }, [loadUsers]) // Only run on mount; filter changes trigger explicit reload

  // Debounced name filter: reload when user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(nameFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [nameFilter, loadUsers])

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      await loadUsers(nameFilter)
    } catch (err) {
      setDeleteError(extractErrorMessages(err).join(' '))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400">{t('users:title')}</h1>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{t('users:subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-theme-sm font-medium text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('users:addUser')}
          </button>
        </div>

        {/* Name filter */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-6 py-3">
          <input
            type="search"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder={t('users:filter.namePlaceholder')}
            className="w-full max-w-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          />
        </div>

        {loading ? (
          <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>
        ) : loadError ? (
          <div className="m-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
            {loadError}
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('users:state.noUsers')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-left">
                  <th className="py-4 px-4 text-theme-sm font-medium text-gray-900 dark:text-white">{t('users:table.name')}</th>
                  <th className="py-4 px-4 text-theme-sm font-medium text-gray-900 dark:text-white">{t('users:table.email')}</th>
                  <th className="py-4 px-4 text-theme-sm font-medium text-gray-900 dark:text-white">{t('users:table.role')}</th>
                  <th className="py-4 px-4 text-theme-sm font-medium text-gray-900 dark:text-white">{t('users:table.orgUnit')}</th>
                  <th className="py-4 px-4 text-right text-theme-sm font-medium text-gray-900 dark:text-white">{t('users:table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-200 dark:border-gray-800">
                    <td className="py-3 px-4 text-theme-sm text-gray-900 dark:text-white">
                      {u.firstName || u.lastName
                        ? [u.firstName, u.lastName].filter(Boolean).join(' ')
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-theme-sm text-gray-900 dark:text-white">{u.email}</td>
                    <td className="py-3 px-4 text-theme-sm text-gray-900 dark:text-white">
                      {t(`enums:role.${ROLE_KEY[u.role] || u.role}`)}
                    </td>
                    <td className="py-3 px-4 text-theme-sm text-gray-900 dark:text-white">
                      {u.orgUnitId ? orgUnitNameById.get(u.orgUnitId) || `#${u.orgUnitId}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-theme-sm">
                      <button
                        type="button"
                        onClick={() => setEditTarget(u)}
                        className="mr-3 cursor-pointer text-brand-500 hover:underline"
                      >
                        {t('users:action.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null)
                          setDeleteTarget(u)
                        }}
                        className="cursor-pointer text-error-500 hover:underline"
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
            await loadUsers(nameFilter)
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
            await loadUsers(nameFilter)
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={t('users:modal.deleteTitle')}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <h2 className="text-base font-semibold text-brand-500 dark:text-brand-400">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
    defaultValues: { firstName: '', lastName: '', email: '', password: '', role: 'Viewer', orgUnitId: '' },
  })
  const role = watch('role')
  const orgUnitRequired = ROLES_REQUIRING_ORG_UNIT.includes(role)

  const onSubmit = async (values) => {
    setServerErrors([])
    const payload = {
      firstName: values.firstName || null,
      lastName: values.lastName || null,
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
        setServerErrors([t('users:error.emailTaken')])
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
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="create-firstName" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.firstName')}</label>
            <input
              id="create-firstName"
              type="text"
              autoComplete="given-name"
              {...register('firstName')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="create-lastName" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.lastName')}</label>
            <input
              id="create-lastName"
              type="text"
              autoComplete="family-name"
              {...register('lastName')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="create-email" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.email')}</label>
          <input
            id="create-email"
            type="email"
            autoComplete="off"
            {...register('email', {
              required: t('users:validation.emailRequired'),
              pattern: { value: /^\S+@\S+\.\S+$/, message: t('users:validation.emailInvalid') },
            })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          />
          {errors.email && <p className="mt-1 text-theme-sm text-error-500">{errors.email.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="create-password" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.password')}</label>
          <input
            id="create-password"
            type="password"
            autoComplete="new-password"
            {...register('password', {
              required: t('users:validation.passwordRequired'),
              minLength: { value: 6, message: t('users:validation.passwordMinLength') },
            })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          />
          {errors.password && (
            <p className="mt-1 text-theme-sm text-error-500">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="create-role" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.role')}</label>
          <select
            id="create-role"
            {...register('role', { required: t('users:validation.roleRequired') })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`enums:role.${ROLE_KEY[r] || r}`)}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-theme-sm text-error-500">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="create-orgUnitId" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t('users:form.orgUnit')}{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            id="create-orgUnitId"
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || t('users:validation.orgUnitRequired'),
            })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
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
            <p className="mt-1 text-theme-sm text-error-500">{errors.orgUnitId.message}</p>
          )}
        </div>

        {serverErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
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
            className="cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700 py-2 px-4 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            {t('users:action.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg border border-brand-500 bg-brand-500 hover:bg-brand-600 py-2 px-4 text-theme-sm text-white disabled:opacity-60"
          >
            {isSubmitting ? t('users:action.saving') : t('users:action.create')}
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
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role || 'Viewer',
      orgUnitId: user.orgUnitId != null ? String(user.orgUnitId) : '',
    },
  })
  const role = watch('role')
  const orgUnitRequired = ROLES_REQUIRING_ORG_UNIT.includes(role)

  const onSubmit = async (values) => {
    setServerErrors([])
    const payload = {
      firstName: values.firstName || null,
      lastName: values.lastName || null,
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
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-firstName" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.firstName')}</label>
            <input
              id="edit-firstName"
              type="text"
              autoComplete="given-name"
              {...register('firstName')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label htmlFor="edit-lastName" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.lastName')}</label>
            <input
              id="edit-lastName"
              type="text"
              autoComplete="family-name"
              {...register('lastName')}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="edit-role" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">{t('users:form.role')}</label>
          <select
            id="edit-role"
            {...register('role', { required: t('users:validation.roleRequired') })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`enums:role.${ROLE_KEY[r] || r}`)}
              </option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-theme-sm text-error-500">{errors.role.message}</p>}
        </div>

        <div className="mb-4">
          <label htmlFor="edit-orgUnitId" className="mb-2 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
            {t('users:form.orgUnit')}{orgUnitRequired ? ' *' : ''}
          </label>
          <select
            id="edit-orgUnitId"
            {...register('orgUnitId', {
              validate: (v) =>
                !orgUnitRequired || (v !== '' && v != null) || t('users:validation.orgUnitRequired'),
            })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-2.5 px-3 text-theme-sm text-gray-900 dark:text-white outline-none focus:border-brand-500"
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
            <p className="mt-1 text-theme-sm text-error-500">{errors.orgUnitId.message}</p>
          )}
        </div>

        {serverErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
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
            className="cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700 py-2 px-4 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            {t('users:action.cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg border border-brand-500 bg-brand-500 hover:bg-brand-600 py-2 px-4 text-theme-sm text-white disabled:opacity-60"
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
      <p className="mb-4 text-theme-sm text-gray-900 dark:text-white">{message}</p>
      {error && (
        <div className="mb-4 rounded-lg border border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg border border-gray-300 dark:border-gray-700 py-2 px-4 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          {cancelLabel || t('action.cancel')}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="cursor-pointer rounded-lg border border-error-300 dark:border-error-700 bg-error-500 hover:bg-error-600 py-2 px-4 text-theme-sm text-white disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  )
}
