import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import AuthShell from '../../components/AuthShell'

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

  const backToLogin = (
    <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
      <Link to="/login" className="lp-link">{t('forgot.backToLogin')}</Link>
    </div>
  )

  if (done) {
    return (
      <AuthShell eyebrow="Безбедност налога" title={t('forgot.title')}>
        <div className="lp-success">{t('forgot.done')}</div>
        {backToLogin}
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Безбедност налога"
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="lp-field">
          <label htmlFor="fp-email" className="lp-label">{t('forgot.emailLabel')}</label>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            className="lp-input"
            {...register('email', { required: t('email.required') })}
          />
          {errors.email && <p className="lp-field-err">{errors.email.message}</p>}
        </div>

        <button type="submit" disabled={isSubmitting} className="lp-btn">
          {isSubmitting ? t('forgot.submitting') : t('forgot.submit')}
        </button>

        {backToLogin}
      </form>
    </AuthShell>
  )
}
