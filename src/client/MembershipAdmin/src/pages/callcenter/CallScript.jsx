// Guided call-script wizard: walks the operator through the 7-step conditional
// flow driven by services/callScript.js's nextStep(), then posts the outcome and
// returns to the queue. Field styling mirrors pages/callcenter/PoolForm.jsx /
// pages/members/MemberForm.jsx conventions.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import callCenterApi from '../../services/callCenterApi'
import {
  nextStep,
  CALL_OUTCOME,
  PARTY_RELATION,
  ACTIVITY_LEVEL,
  ENGAGEMENT_AREA,
} from '../../services/callScript'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'

export default function CallScript() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [step, setStep] = useState('outcome')
  const [answers, setAnswers] = useState({ engagementAreas: [] })
  const [matches, setMatches] = useState([])
  const [linking, setLinking] = useState(false)
  const [linkedMemberId, setLinkedMemberId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    callCenterApi
      .getContact(id)
      .then((c) => {
        if (cancelled) return
        setContact(c)
        setAnswers((a) => ({
          ...a,
          updatedPhone: c.phoneNumber ?? '',
          updatedEmail: c.email ?? '',
          updatedAddress: c.address ?? '',
        }))
        setLinkedMemberId(c.matchedMemberId ?? c.convertedMemberId ?? null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err?.response?.data?.message || 'Учитавање контакта није успело.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    callCenterApi
      .matchSuggestions(id)
      .then((m) => {
        if (!cancelled) setMatches(m ?? [])
      })
      .catch(() => {
        if (!cancelled) setMatches([])
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const setAnswer = (key, value) => setAnswers((a) => ({ ...a, [key]: value }))

  const toggleArea = (v) =>
    setAnswers((a) => ({
      ...a,
      engagementAreas: a.engagementAreas.includes(v)
        ? a.engagementAreas.filter((x) => x !== v)
        : [...a.engagementAreas, v],
    }))

  const finish = async () => {
    const payload = {
      outcome: answers.outcome,
      attemptNote: answers.attemptNote ?? null,
      partyRelation: answers.relation ?? null,
      activityLevel: answers.activity ?? null,
      wantsToBeActive: answers.wantsToBeActive ?? null,
      engagementAreas: answers.engagementAreas ?? [],
      updatedPhone: answers.updatedPhone || null,
      updatedEmail: answers.updatedEmail || null,
      updatedAddress: answers.updatedAddress || null,
      suggestionNote: answers.suggestionNote ?? null,
      knowsPotentialMembers: answers.knowsPotentialMembers ?? null,
      willingToEnroll: answers.willingToEnroll ?? null,
    }
    setSaving(true)
    setSaveError(null)
    try {
      await callCenterApi.saveOutcome(id, payload)
      navigate('/callcenter/queue')
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Чување исхода није успело.')
    } finally {
      setSaving(false)
    }
  }

  const advance = () => {
    const next = nextStep(step, answers)
    if (next === 'end') {
      finish()
      return
    }
    setStep(next)
  }

  const link = async (memberId) => {
    setLinking(true)
    try {
      await callCenterApi.linkMember(id, memberId)
      setLinkedMemberId(memberId)
    } catch {
      // non-blocking — operator can retry
    } finally {
      setLinking(false)
    }
  }

  const enroll = () => {
    if (!contact) return
    navigate('/members/new', {
      state: {
        extracted: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          city: contact.city ?? null,
          email: answers.updatedEmail || contact.email || null,
          phones: [{ number: answers.updatedPhone || contact.phoneNumber }],
        },
        callContactId: Number(id),
      },
    })
  }

  if (loading) return <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">Учитавање...</div>
  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {loadError}
        </div>
      </div>
    )
  }
  if (!contact) return null

  const canAdvance = step !== 'outcome' || answers.outcome !== undefined

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-brand-500 dark:text-brand-400 mb-1">
        {contact.firstName} {contact.lastName}
      </h1>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400 mb-6">
        {contact.phoneNumber} {contact.city ? `· ${contact.city}` : ''}
      </p>

      {saveError && (
        <div className="mb-4 rounded-lg border border-error-200 dark:border-error-700 bg-error-50 dark:bg-error-500/10 px-4 py-3 text-theme-sm text-error-600 dark:text-error-400">
          {saveError}
        </div>
      )}

      {step !== 'outcome' && matches.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-3">
          <p className="text-theme-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">
            Могуће подударање са постојећим чланом:
          </p>
          <div className="space-y-1.5">
            {matches.map((m) => (
              <div key={m.memberId} className="flex items-center justify-between gap-3">
                <span className="text-theme-xs text-gray-700 dark:text-gray-300">
                  {m.displayName} ({m.committeeName})
                </span>
                {linkedMemberId === m.memberId ? (
                  <span className="text-theme-xs font-medium text-success-600 dark:text-success-400">Повезано</span>
                ) : (
                  <button
                    type="button"
                    disabled={linking}
                    onClick={() => link(m.memberId)}
                    className="text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                  >
                    Повежи
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className={sectionClass}>
        {step === 'outcome' && (
          <Step title="Да ли је успостављен контакт са правом особом?">
            {Object.entries(CALL_OUTCOME).map(([k, v]) => (
              <Radio
                key={v}
                name="outcome"
                label={k}
                checked={answers.outcome === v}
                onChange={() => setAnswer('outcome', v)}
              />
            ))}
          </Step>
        )}

        {step === 'relation' && (
          <Step title="Да ли желите да и даље будете део странке?">
            {Object.entries(PARTY_RELATION).map(([k, v]) => (
              <Radio
                key={v}
                name="relation"
                label={k}
                checked={answers.relation === v}
                onChange={() => setAnswer('relation', v)}
              />
            ))}
          </Step>
        )}

        {step === 'activity' && (
          <Step title="Да ли сте тренутно активни у странци?">
            {Object.entries(ACTIVITY_LEVEL).map(([k, v]) => (
              <Radio
                key={v}
                name="activity"
                label={k}
                checked={answers.activity === v}
                onChange={() => setAnswer('activity', v)}
              />
            ))}
            {answers.activity === ACTIVITY_LEVEL.Inactive && (
              <label className="flex items-center gap-2 mt-2 text-theme-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={answers.wantsToBeActive === true}
                  onChange={(e) => setAnswer('wantsToBeActive', e.target.checked)}
                />
                Да ли бисте желели да будете активни?
              </label>
            )}
          </Step>
        )}

        {step === 'engagement' && (
          <Step title="У ком облику бисте желели да будете ангажовани?">
            {Object.entries(ENGAGEMENT_AREA).map(([k, v]) => (
              <label key={v} className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={answers.engagementAreas.includes(v)} onChange={() => toggleArea(v)} />
                {k}
              </label>
            ))}
          </Step>
        )}

        {step === 'contactData' && (
          <Step title="Ажурирање контакт података">
            <Field label="Телефон" value={answers.updatedPhone} onChange={(v) => setAnswer('updatedPhone', v)} />
            <Field label="Email" value={answers.updatedEmail} onChange={(v) => setAnswer('updatedEmail', v)} />
            <Field label="Адреса" value={answers.updatedAddress} onChange={(v) => setAnswer('updatedAddress', v)} />
            {!linkedMemberId && !contact.convertedMemberId && (
              <button
                type="button"
                onClick={enroll}
                className="mt-3 rounded-lg border border-brand-300 dark:border-brand-700 px-4 py-2 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                Учлани као новог члана
              </button>
            )}
          </Step>
        )}

        {step === 'suggestion' && (
          <Step title="Да ли имате неку сугестију или предлог?">
            <textarea
              className={`${inputClass} min-h-24`}
              value={answers.suggestionNote ?? ''}
              onChange={(e) => setAnswer('suggestionNote', e.target.value)}
            />
          </Step>
        )}

        {step === 'recommendations' && (
          <Step title="Препоруке потенцијалних чланова">
            <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={answers.knowsPotentialMembers === true}
                onChange={(e) => setAnswer('knowsPotentialMembers', e.target.checked)}
              />
              Познајете некога ко дели вредности странке?
            </label>
            <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={answers.willingToEnroll === true}
                onChange={(e) => setAnswer('willingToEnroll', e.target.checked)}
              />
              Спремни да их учланимо?
            </label>
          </Step>
        )}
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canAdvance || saving}
          onClick={advance}
          className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Чување...' : 'Даље'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/callcenter/queue')}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Откажи
        </button>
      </div>
    </div>
  )
}

function Step({ title, children }) {
  return (
    <div>
      <h2 className="text-theme-sm font-medium text-gray-900 dark:text-white mb-3">{title}</h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Radio({ name, label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  )
}

function Field({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <label className={labelClass}>{label}</label>
      <input className={inputClass} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
