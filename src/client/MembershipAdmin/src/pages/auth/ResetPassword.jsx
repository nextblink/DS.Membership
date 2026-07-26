import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../framework/api'
import AuthShell from '../../components/AuthShell'

export default function ResetPassword() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const email = params.get('email') || ''
  const token = params.get('token') || ''
  const mode = params.get('mode') === 'create' ? 'create' : 'reset'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { password: '', confirm: '' },
  })
  const [serverError, setServerError] = useState(null)
  const [success, setSuccess] = useState(false)
  // A link with no email/token can never work, so don't put a form in front of
  // it — the server tells us the same thing via code === 'InvalidLink'.
  const [linkInvalid, setLinkInvalid] = useState(!email || !token)

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
      // The API answers with a stable code so we can localize here instead of
      // echoing its (English) message.
      if (err?.response?.data?.code === 'InvalidLink') {
        setLinkInvalid(true)
        return
      }
      setServerError(t('reset.policy'))
    }
  }

  const title = mode === 'create' ? t('reset.titleCreate') : t('reset.titleReset')
  const subtitle = mode === 'create' ? t('reset.subtitleCreate') : t('reset.subtitleReset')

  const backToLogin = (
    <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
      <Link to="/login" className="lp-link">{t('forgot.backToLogin')}</Link>
    </div>
  )

  if (linkInvalid) {
    return (
      <AuthShell eyebrow="Безбедност налога" title={t('reset.invalidTitle')}>
        <p className="lp-note">{t('reset.invalidLink')}</p>
        <Link to="/forgot-password" className="lp-btn">{t('reset.requestNewLink')}</Link>
        {backToLogin}
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell eyebrow="Безбедност налога" title={title}>
        <div className="lp-success">{t('reset.success')}</div>
        {backToLogin}
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Безбедност налога" title={title} subtitle={subtitle}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="lp-field">
          <label htmlFor="rp-password" className="lp-label">{t('reset.passwordLabel')}</label>
          <input
            id="rp-password"
            type="password"
            autoComplete="new-password"
            className="lp-input"
            {...register('password', {
              required: t('reset.passwordLabel'),
              minLength: { value: 8, message: t('reset.minLength') },
              // Mirrors Identity's RequireDigit so the rule is enforced in
              // Serbian here rather than coming back as an English server error.
              pattern: { value: /\d/, message: t('reset.needsDigit') },
            })}
          />
          {errors.password && <p className="lp-field-err">{errors.password.message}</p>}
        </div>

        <div className="lp-field">
          <label htmlFor="rp-confirm" className="lp-label">{t('reset.confirmLabel')}</label>
          <input
            id="rp-confirm"
            type="password"
            autoComplete="new-password"
            className="lp-input"
            {...register('confirm', { required: t('reset.confirmLabel') })}
          />
          {errors.confirm && <p className="lp-field-err">{errors.confirm.message}</p>}
        </div>

        {serverError && <div className="lp-error">{serverError}</div>}

        <button
          type="submit"
          disabled={isSubmitting || !token || !email}
          className="lp-btn"
        >
          {isSubmitting ? t('reset.submitting') : t('reset.submit')}
        </button>

        {backToLogin}
      </form>
    </AuthShell>
  )
}
