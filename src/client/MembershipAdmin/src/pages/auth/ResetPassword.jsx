import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

export default function ResetPassword() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const email = params.get('email') || ''
  const token = params.get('token') || ''
  const mode = params.get('mode') === 'create' ? 'create' : 'reset'

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { password: '', confirm: '' },
  })
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async ({ password, confirm }) => {
    setServerError(null)
    if (password !== confirm) {
      setServerError(t('reset.mismatch'))
      return
    }
    try {
      await api.post('/api/auth/reset-password', { email, token, newPassword: password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.title || t('reset.invalidLink')
      setServerError(msg)
    }
  }

  const title = mode === 'create' ? t('reset.titleCreate') : t('reset.titleReset')
  const subtitle = mode === 'create' ? t('reset.subtitleCreate') : t('reset.subtitleReset')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {success ? (
          <p className="text-sm text-green-600">{t('reset.success')}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>

            <label htmlFor="rp-password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('reset.passwordLabel')}
            </label>
            <input
              id="rp-password"
              type="password"
              autoComplete="new-password"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('password', {
                required: t('reset.passwordLabel'),
                minLength: { value: 8, message: t('reset.minLength') },
              })}
            />
            {errors.password && <p className="mb-2 text-xs text-red-500">{errors.password.message}</p>}

            <label htmlFor="rp-confirm" className="mb-1.5 mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('reset.confirmLabel')}
            </label>
            <input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('confirm', { required: t('reset.confirmLabel') })}
            />
            {errors.confirm && <p className="mb-2 text-xs text-red-500">{errors.confirm.message}</p>}

            {serverError && <p className="mt-3 text-sm text-red-500">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting || !token || !email}
              className="mt-5 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting ? t('reset.submitting') : t('reset.submit')}
            </button>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-brand-500 hover:underline">
                {t('forgot.backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
