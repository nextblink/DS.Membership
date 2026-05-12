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
      <h1 className="mb-6 text-2xl font-semibold text-black">{t('title')}</h1>

      {/* Current user info card */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-6 shadow-default">
        <h2 className="mb-4 text-lg font-semibold text-black">{t('account')}</h2>

        {loading && <p className="text-sm text-body">{t('state.loading')}</p>}

        {!loading && loadError && (
          <div className="rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
            {loadError}
          </div>
        )}

        {!loading && !loadError && user && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-body">{t('fields.email')}</dt>
              <dd data-testid="profile-email" className="mt-1 text-sm text-black">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-body">{t('fields.role')}</dt>
              <dd data-testid="profile-role" className="mt-1 text-sm text-black">{user.role ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-body">{t('fields.orgUnit')}</dt>
              <dd data-testid="profile-org-unit" className="mt-1 text-sm text-black">{orgUnitName ?? '—'}</dd>
            </div>
            {user.id && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-body">{t('fields.userId')}</dt>
                <dd className="mt-1 break-all text-sm text-black">{user.id}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Change password card */}
      <div className="rounded-sm border border-stroke bg-white p-6 shadow-default">
        <h2 className="mb-4 text-lg font-semibold text-black">{t('changePassword.title')}</h2>

        <form onSubmit={handleSubmit(onChangePassword)} noValidate className="max-w-md">
          <div className="mb-4">
            <label
              htmlFor="currentPassword"
              className="mb-2.5 block text-sm font-medium text-black"
            >
              {t('changePassword.current')}
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword', { required: t('validation.currentRequired') })}
              className="w-full rounded-sm border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none"
            />
            {errors.currentPassword && (
              <p className="mt-1 text-sm text-danger">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="newPassword"
              className="mb-2.5 block text-sm font-medium text-black"
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
              className="w-full rounded-sm border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none"
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-danger">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirmNewPassword"
              className="mb-2.5 block text-sm font-medium text-black"
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
              className="w-full rounded-sm border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none"
            />
            {errors.confirmNewPassword && (
              <p className="mt-1 text-sm text-danger">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          {pwSuccess && (
            <div className="mb-4 rounded-sm border border-success bg-success/10 px-4 py-2 text-sm text-success">
              {pwSuccess}
            </div>
          )}

          {pwError && (
            <div className="mb-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger">
              {pwError}
            </div>
          )}

          {pwNotImplemented && (
            <div data-testid="pw-not-implemented" className="mb-4 rounded-sm border border-warning bg-warning/10 px-4 py-2 text-sm text-warning">
              {t('changePassword.notSupported')}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-sm border border-primary bg-primary py-3 px-6 text-white transition hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? t('changePassword.submitting') : t('changePassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
