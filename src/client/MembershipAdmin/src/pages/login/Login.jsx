import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import auth from '../../framework/auth'

export default function Login() {
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
        setSubmitError('Invalid email or password.')
      } else {
        setSubmitError(err?.response?.data?.message || err?.message || 'Login failed.')
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 py-12">
      <div className="w-full max-w-md rounded-sm border border-stroke bg-white p-8 shadow-default">
        <h1 className="mb-2 text-2xl font-semibold text-black">Sign in</h1>
        <p className="mb-6 text-sm text-body">Membership admin panel</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="login-form">
          <div className="mb-4">
            <label htmlFor="email" className="mb-2.5 block text-sm font-medium text-black">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/, message: 'Enter a valid email address' },
              })}
              className="w-full rounded-sm border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-2.5 block text-sm font-medium text-black">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: 'Password is required' })}
              className="w-full rounded-sm border border-stroke bg-transparent py-3 px-4 text-black outline-none focus:border-primary focus-visible:shadow-none"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
            )}
          </div>

          {submitError && (
            <div
              data-testid="login-error"
              className="mb-4 rounded-sm border border-danger bg-danger/10 px-4 py-2 text-sm text-danger"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="login-submit"
            className="w-full cursor-pointer rounded-sm border border-primary bg-primary py-3 px-6 text-white transition hover:bg-opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
