import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import auth from '../../framework/auth'
import { version } from '../../../package.json'

/*
  Brand palette extracted from marcipanoLogo.png:
  --col-navy:   #0B1F35   (darkest background)
  --col-blue:   #1B4F8A   (deep blue — logo figures)
  --col-ocean:  #2E6BAD   (mid blue)
  --col-sky:    #3E8DC4   (light blue)
  --col-teal:   #4ABEA0   (teal-green — growth arrow)
  --col-mint:   #6FCFB8   (lightest, arrow tip)
*/

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --navy:  #0B1F35;
    --blue:  #1B4F8A;
    --ocean: #2E6BAD;
    --sky:   #3E8DC4;
    --teal:  #4ABEA0;
    --mint:  #6FCFB8;
  }

  .lp-root {
    display: flex;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    background: var(--navy);
  }

  /* ── LEFT PANEL ─────────────────────────────── */
  .lp-brand {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 2.5rem 3rem;
    overflow: hidden;
    background: linear-gradient(160deg, #081828 0%, #0B1F35 60%, #0d2540 100%);
  }

  /* Atmospheric glows matching logo colors */
  .lp-orb-1 {
    position: absolute;
    width: 560px; height: 560px;
    top: -180px; left: -140px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(30,79,138,0.28) 0%, transparent 65%);
    animation: lpDrift1 9s ease-in-out infinite;
  }

  .lp-orb-2 {
    position: absolute;
    width: 380px; height: 380px;
    bottom: -100px; right: -80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(74,190,160,0.18) 0%, transparent 65%);
    animation: lpDrift2 12s ease-in-out infinite;
  }

  .lp-orb-3 {
    position: absolute;
    width: 260px; height: 260px;
    top: 38%; left: 50%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(62,141,196,0.12) 0%, transparent 70%);
    animation: lpDrift1 14s ease-in-out infinite reverse;
  }

  @keyframes lpDrift1 {
    0%, 100% { transform: translate(0, 0); }
    33%       { transform: translate(20px, 26px); }
    66%       { transform: translate(-14px, 12px); }
  }
  @keyframes lpDrift2 {
    0%, 100% { transform: translate(0, 0); }
    50%       { transform: translate(-24px, -20px); }
  }

  /* grid */
  .lp-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 52px 52px;
    pointer-events: none;
  }

  /* ghost silhouettes */
  .lp-sils {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  /* brand header */
  .lp-brand-top {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lp-brand-top img {
    width: 44px; height: 44px;
    object-fit: contain;
    filter: drop-shadow(0 2px 12px rgba(74,190,160,0.35));
  }

  .lp-brand-name {
    font-size: 1.05rem;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
    letter-spacing: 0.06em;
  }

  /* center copy */
  .lp-brand-mid {
    position: relative;
    z-index: 2;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    animation: lpFadeUp 0.7s ease both 0.1s;
  }

  .lp-eyebrow {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--teal);
    margin-bottom: 1.25rem;
  }

  .lp-headline {
    font-family: 'DM Sans', sans-serif;
    font-size: clamp(2rem, 3vw, 3rem);
    font-weight: 700;
    color: #ffffff;
    line-height: 1.18;
    margin-bottom: 1.5rem;
  }

  .lp-headline em {
    font-style: normal;
    background: linear-gradient(110deg, var(--sky) 0%, var(--teal) 55%, var(--mint) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .lp-desc {
    font-size: 0.9rem;
    font-weight: 300;
    color: rgba(255,255,255,0.36);
    line-height: 1.72;
    max-width: 300px;
  }

  /* bottom stats */
  .lp-stats {
    position: relative;
    z-index: 2;
    display: flex;
    gap: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .lp-stat-num {
    display: block;
    font-family: 'DM Sans', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }

  .lp-stat-lbl {
    display: block;
    font-size: 0.67rem;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.28);
    margin-top: 0.2rem;
  }

  /* ── DIVIDER ─────────────────────────────────── */
  .lp-divider {
    width: 1px;
    flex-shrink: 0;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(46,107,173,0.0) 5%,
      rgba(46,107,173,0.55) 30%,
      rgba(74,190,160,0.55) 70%,
      rgba(74,190,160,0.0) 95%,
      transparent 100%
    );
    position: relative;
  }

  .lp-divider::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--teal);
    box-shadow: 0 0 14px 5px rgba(74,190,160,0.55);
    animation: lpPulse 3s ease-in-out infinite;
  }

  @keyframes lpPulse {
    0%, 100% { opacity: 1;   transform: translate(-50%, -50%) scale(1); }
    50%       { opacity: 0.4; transform: translate(-50%, -50%) scale(1.8); }
  }

  /* ── RIGHT PANEL ─────────────────────────────── */
  .lp-form-panel {
    width: 460px;
    flex-shrink: 0;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3rem 3.25rem;
    animation: lpFadeUp 0.5s ease both;
  }

  .lp-form-header { margin-bottom: 2.25rem; }

  .lp-form-eyebrow {
    font-size: 0.68rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--teal);
    margin-bottom: 0.7rem;
  }

  .lp-form-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.9rem;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.15;
    margin-bottom: 0.5rem;
  }

  .lp-form-sub {
    font-size: 0.85rem;
    color: #9aaab8;
  }

  /* fields */
  .lp-field { margin-bottom: 1.15rem; }

  .lp-label {
    display: block;
    font-size: 0.78rem;
    font-weight: 500;
    color: #3c4f63;
    margin-bottom: 0.45rem;
  }

  .lp-input {
    width: 100%;
    border: 1.5px solid #dde6ef;
    border-radius: 9px;
    padding: 0.72rem 1rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    color: var(--navy);
    background: #f7fafc;
    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
    outline: none;
  }

  .lp-input::placeholder { color: #b3c3d0; }

  .lp-input:focus {
    border-color: var(--ocean);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(46,107,173,0.1);
  }

  .lp-field-err {
    font-size: 0.73rem;
    color: #c0392b;
    margin-top: 0.35rem;
  }

  /* button */
  .lp-btn {
    width: 100%;
    margin-top: 0.75rem;
    padding: 0.85rem 1.5rem;
    border: none;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.03em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    background: linear-gradient(120deg, var(--blue) 0%, var(--ocean) 40%, var(--teal) 100%);
    background-size: 200% 100%;
    background-position: left center;
    transition: background-position 0.45s ease, box-shadow 0.25s, transform 0.15s;
  }

  .lp-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform 0.45s ease;
  }

  .lp-btn:hover:not(:disabled) {
    background-position: right center;
    box-shadow: 0 8px 28px rgba(46,107,173,0.35);
    transform: translateY(-1px);
  }

  .lp-btn:hover:not(:disabled)::after { transform: translateX(100%); }
  .lp-btn:active:not(:disabled)       { transform: translateY(0); }
  .lp-btn:disabled                    { opacity: 0.6; cursor: not-allowed; }

  /* error */
  .lp-error {
    background: #fef9f9;
    border: 1px solid #fbd0cc;
    border-left: 3px solid #c0392b;
    border-radius: 8px;
    padding: 0.7rem 0.9rem;
    font-size: 0.8rem;
    color: #962d22;
    margin-bottom: 1rem;
  }

  /* footer */
  .lp-form-footer {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #eef3f8;
    text-align: center;
    font-size: 0.72rem;
    color: #b8c9d8;
  }

  @keyframes lpFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── RESPONSIVE ──────────────────────────────── */
  @media (max-width: 860px) {
    .lp-root        { flex-direction: column; }
    .lp-brand       { flex: none; min-height: 220px; padding: 2rem; }
    .lp-brand-mid   { display: none; }
    .lp-stats       { display: none; }
    .lp-divider     { width: 100%; height: 1px; }
    .lp-divider::after { top: 50%; left: 50%; }
    .lp-form-panel  { width: 100%; padding: 2rem 1.5rem; }
  }
`

/* Ghost person silhouette — echoes the logo's human figures */
const GhostFigure = ({ style }) => (
  <svg
    width="56" height="68" viewBox="0 0 56 68"
    fill="white" style={{ position: 'absolute', ...style }}
  >
    <circle cx="28" cy="14" r="12" />
    <path d="M4 62 Q4 36 28 36 Q52 36 52 62 Z" />
  </svg>
)

const SILS = [
  { left: '5%',  top: '7%',  opacity: 0.055, scale: 1.3,  dur: 7,  delay: 0   },
  { left: '20%', top: '65%', opacity: 0.04,  scale: 0.9,  dur: 9,  delay: 1.3 },
  { left: '52%', top: '12%', opacity: 0.05,  scale: 1.55, dur: 8,  delay: 0.5 },
  { left: '70%', top: '55%', opacity: 0.035, scale: 1.1,  dur: 11, delay: 2   },
  { left: '36%', top: '42%', opacity: 0.03,  scale: 0.85, dur: 10, delay: 1.8 },
  { left: '76%', top: '18%', opacity: 0.045, scale: 0.75, dur: 6,  delay: 0.9 },
  { left: '3%',  top: '80%', opacity: 0.04,  scale: 1.15, dur: 12, delay: 3.1 },
  { left: '44%', top: '78%', opacity: 0.03,  scale: 0.95, dur: 8,  delay: 2.5 },
]

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
    <>
      <style>{css}</style>
      <div className="lp-root">

        {/* ── TOP-RIGHT LOGO ── */}
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <img src="/assets/marcipanoLogo.png" alt="Marcipano" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: '#1B4F8A', letterSpacing: '0.05em' }}>Marcipano</span>
        </div>

        {/* ── LEFT BRAND PANEL ── */}
        <div className="lp-brand">
          <div className="lp-orb-1" />
          <div className="lp-orb-2" />
          <div className="lp-orb-3" />
          <div className="lp-grid" />
          <div className="lp-sils">
            {SILS.map((s, i) => (
              <GhostFigure
                key={i}
                style={{
                  left: s.left,
                  top: s.top,
                  opacity: s.opacity,
                  transform: `scale(${s.scale})`,
                  transformOrigin: 'top left',
                  animation: `lpDrift1 ${s.dur}s ease-in-out ${s.delay}s infinite`,
                }}
              />
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 2, height: '2rem' }} />

          <div className="lp-brand-mid">
            <div className="lp-eyebrow">Платформа за чланство</div>
            <h1 className="lp-headline">
              Управљајте<br />
              <em>члановима</em><br />
              прецизно.
            </h1>
            <p className="lp-desc">
              Централизована евиденција, организациона хијерархија и аналитика — све наједном месту.
            </p>
          </div>

          <div className="lp-stats">
            <div>
              <span className="lp-stat-num">360°</span>
              <span className="lp-stat-lbl">Преглед</span>
            </div>
            <div>
              <span className="lp-stat-num">∞</span>
              <span className="lp-stat-lbl">Чланова</span>
            </div>
            <div>
              <span className="lp-stat-num">24/7</span>
              <span className="lp-stat-lbl">Приступ</span>
            </div>
          </div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="lp-divider" />

        {/* ── RIGHT FORM PANEL ── */}
        <div className="lp-form-panel">
          <div className="lp-form-header">
            <div className="lp-form-eyebrow">Добродошли назад</div>
            <h2 className="lp-form-title">{t('title')}</h2>
            <p className="lp-form-sub">{t('subtitle')}</p>
          </div>

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

          <div className="lp-form-footer">
            © 2025 Marcipano · Систем за управљање чланством
            <div style={{ marginTop: '0.3rem', color: '#2E6BAD', fontWeight: 500 }}>
              v{version} · {__BUILD_DATE__}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
