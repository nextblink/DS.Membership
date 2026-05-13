import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../../framework/auth'

export default function Login() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '', password: '' } })

  const onSubmit = async ({ email, password }) => {
    setSubmitError(null)
    try {
      await auth.login(email, password)
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        setSubmitError(t('error.invalidCredentials'))
      } else {
        setSubmitError(err?.response?.data?.message || err?.message || t('error.generic'))
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-theme-md">
        <div className="mb-8 text-center">
          <img src="/assets/logo.png" alt="Logo" className="mx-auto mb-4 size-16 object-contain" />
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('email.label')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: t('email.required'),
                pattern: { value: /^\S+@\S+$/, message: t('email.invalid') },
              })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400"
              placeholder={t('email.placeholder')}
            />
            {errors.email && (
              <p className="mt-1.5 text-theme-xs text-error-500">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-300">
              {t('password.label')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: t('password.required') })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-theme-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:focus:border-brand-400"
              placeholder={t('password.placeholder')}
            />
            {errors.password && (
              <p className="mt-1.5 text-theme-xs text-error-500">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <div
              data-testid="login-error"
              className="mb-5 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="login-submit"
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 px-6 py-3 text-theme-sm font-medium text-white transition disabled:opacity-60"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
