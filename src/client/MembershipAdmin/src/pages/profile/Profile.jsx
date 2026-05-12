import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import auth from '../../framework/auth'

export default function Profile() {
  const { t } = useTranslation('profile')
  const [user, setUser] = useState(() => auth.getUser())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [pwSuccess, setPwSuccess] = useState(null)
  const [pwError, setPwError] = useState(null)
  const [pwNotImplemented, setPwNotImplemented] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const newPassword = watch('newPassword')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    api
      .get('/api/auth/me')
      .then((res) => {
        if (cancelled) return
        setUser(res.data ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(
          err?.response?.data?.message || err?.message || t('error.loadFailed'),
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const onChangePassword = async ({ currentPassword, newPassword, confirmNewPassword }) => {
    setPwSuccess(null)
    setPwError(null)
    setPwNotImplemented(false)

    if (newPassword !== confirmNewPassword) {
      setPwError(t('validation.confirmMismatch'))
      return
    }

    try {
      await api.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      })
      setPwSuccess(t('changePassword.success'))
      reset({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
    } catch (err) {
      const status = err?.response?.status
      if (status === 404 || status === 501) {
        setPwNotImplemented(true)
        return
      }
      setPwError(
        err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          t('error.changeFailed'),
      )
    }
  }

  const orgUnitName =
    user?.orgUnit?.name ??
    user?.orgUnitName ??
    (user?.orgUnitId ? `#${user.orgUnitId}` : null)

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>

      {/* Current user info card */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('account')}</h2>

        {loading && <p className="text-theme-sm text-gray-500 dark:text-gray-400">{t('state.loading')}</p>}

        {!loading && loadError && (
          <div className="rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
            {loadError}
          </div>
        )}

        {!loading && !loadError && user && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-theme-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('fields.email')}</dt>
              <dd data-testid="profile-email" className="mt-1 text-theme-sm text-gray-900 dark:text-white">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-theme-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('fields.role')}</dt>
              <dd data-testid="profile-role" className="mt-1 text-theme-sm text-gray-900 dark:text-white">{user.role ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-theme-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('fields.orgUnit')}</dt>
              <dd data-testid="profile-org-unit" className="mt-1 text-theme-sm text-gray-900 dark:text-white">{orgUnitName ?? '—'}</dd>
            </div>
            {user.id && (
              <div>
                <dt className="text-theme-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('fields.userId')}</dt>
                <dd className="mt-1 break-all text-theme-sm text-gray-900 dark:text-white">{user.id}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Change password card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{t('changePassword.title')}</h2>

        <form onSubmit={handleSubmit(onChangePassword)} noValidate className="max-w-md">
          <div className="mb-4">
            <label
              htmlFor="currentPassword"
              className="mb-2.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('changePassword.current')}
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword', { required: t('validation.currentRequired') })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent py-3 px-4 text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus-visible:shadow-none"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-theme-sm text-error-500">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="newPassword"
              className="mb-2.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('changePassword.new')}
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register('newPassword', {
                required: t('validation.newRequired'),
                minLength: { value: 6, message: t('validation.newMinLength') },
              })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent py-3 px-4 text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus-visible:shadow-none"
            />
            {errors.newPassword && (
              <p className="mt-1 text-theme-sm text-error-500">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmNewPassword"
              className="mb-2.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('changePassword.confirm')}
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmNewPassword', {
                required: t('validation.confirmRequired'),
                validate: (value) =>
                  value === newPassword || t('validation.confirmMismatch'),
              })}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent py-3 px-4 text-gray-900 dark:text-white outline-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus-visible:shadow-none"
            />
            {errors.confirmNewPassword && (
              <p className="mt-1 text-theme-sm text-error-500">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          {pwSuccess && (
            <div className="mb-4 rounded-lg border border-success-200 dark:border-success-700 bg-success-50 dark:bg-success-500/10 px-4 py-2 text-theme-sm text-success-600 dark:text-success-400">
              {pwSuccess}
            </div>
          )}

          {pwError && (
            <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-2 text-theme-sm text-error-500">
              {pwError}
            </div>
          )}

          {pwNotImplemented && (
            <div data-testid="pw-not-implemented" className="mb-4 rounded-lg border border-warning-300 dark:border-warning-700 bg-warning-50 dark:bg-warning-900/20 px-4 py-2 text-theme-sm text-warning-600 dark:text-warning-400">
              {t('changePassword.notSupported')}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg border border-brand-500 bg-brand-500 py-3 px-6 text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isSubmitting ? t('changePassword.submitting') : t('changePassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
