import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'

export default function ForgotPassword() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: '' },
  })
  const [done, setDone] = useState(false)

  const onSubmit = async ({ email }) => {
    try {
      await api.post('/api/auth/forgot-password', { email })
    } catch {
      // Neutral UX: always show the same confirmation.
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow dark:bg-gray-800">
        <h1 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          {t('forgot.title')}
        </h1>
        {done ? (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{t('forgot.done')}</p>
            <Link to="/login" className="text-sm text-brand-500 hover:underline">
              {t('forgot.backToLogin')}
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{t('forgot.subtitle')}</p>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {t('forgot.emailLabel')}
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              className="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              {...register('email', { required: t('email.required') })}
            />
            {errors.email && <p className="mb-2 text-xs text-red-500">{errors.email.message}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
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
