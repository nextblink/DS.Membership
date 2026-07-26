import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../../framework/auth'
import AuthShell from '../../components/AuthShell'

export default function Login() {
  const { t } = useTranslation('auth', { lng: 'sr' })
  const navigate = useNavigate()
  const location = useLocation()
  const [submitError, setSubmitError] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm({ defaultValues: { email: '', password: '' } })

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
    <AuthShell
      eyebrow="Добродошли назад"
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
        <div className="lp-field">
          <label htmlFor="email" className="lp-label">{t('email.label')}</label>
          <input
            id="email" type="email" autoComplete="email"
            placeholder={t('email.placeholder')}
            className="lp-input"
            {...register('email', {
              required: t('email.required'),
              pattern: { value: /^\S+@\S+$/, message: t('email.invalid') },
            })}
          />
          {errors.email && <p className="lp-field-err">{errors.email.message}</p>}
        </div>

        <div className="lp-field">
          <label htmlFor="password" className="lp-label">{t('password.label')}</label>
          <input
            id="password" type="password" autoComplete="current-password"
            placeholder={t('password.placeholder')}
            className="lp-input"
            {...register('password', { required: t('password.required') })}
          />
          {errors.password && <p className="lp-field-err">{errors.password.message}</p>}
        </div>

        <div className="lp-forgot" style={{ marginTop: 8, marginBottom: 16, textAlign: 'right' }}>
          <Link to="/forgot-password" className="lp-link">{t('forgotLink')}</Link>
        </div>

        {submitError && (
          <div className="lp-error" data-testid="login-error">{submitError}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="login-submit"
          className="lp-btn"
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </form>
    </AuthShell>
  )
}
