// Single-page call script: renders every applicable section (outcome, relation,
// activity, engagement, contactData, suggestion, recommendations) on one page at
// once, growing downward as the operator answers, instead of the earlier
// click-through wizard. Section visibility is driven entirely by walking
// services/callScript.js's nextStep() — the single source of truth for which
// sections are relevant/skippable — so this component never reimplements that
// branching logic. Field styling mirrors pages/callcenter/PoolForm.jsx /
// pages/members/MemberForm.jsx conventions.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import callCenterApi from '../../services/callCenterApi'
import {
  nextStep,
  CALL_OUTCOME,
  PARTY_RELATION,
  ACTIVITY_LEVEL,
  ENGAGEMENT_AREA,
  toEnumKey,
} from '../../services/callScript'

const sectionClass = 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-theme-sm mb-6'
const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1'
const inputClass =
  'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-theme-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'

// Walks nextStep() from 'outcome' forward, collecting every section reached so far.
// A section is only added once its own gating answer has been filled in — otherwise
// nextStep() can't yet know whether later sections are relevant, so we stop there.
// This reuses nextStep() as the single source of truth for the skip/branch rules;
// the only logic duplicated here is "has the current section been answered yet",
// not the branching itself.
function computeVisibleSections(answers) {
  const visible = []
  let current = 'outcome'
  while (current !== 'end') {
    visible.push(current)
    if (current === 'outcome' && answers.outcome === undefined) break
    if (current === 'relation' && answers.relation === undefined) break
    if (current === 'activity' && answers.activity === undefined) break
    current = nextStep(current, answers)
  }
  return visible
}

export default function CallScript() {
  const { t } = useTranslation(['callcenter', 'common', 'enums'])
  const { id } = useParams()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
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
        setLoadError(err?.response?.data?.message || t('callcenter:script.loadFailed'))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const visibleSections = useMemo(() => computeVisibleSections(answers), [answers])
  const isVisible = (key) => visibleSections.includes(key)

  const setAnswer = (key, value) => setAnswers((a) => ({ ...a, [key]: value }))

  const toggleArea = (v) =>
    setAnswers((a) => ({
      ...a,
      engagementAreas: a.engagementAreas.includes(v)
        ? a.engagementAreas.filter((x) => x !== v)
        : [...a.engagementAreas, v],
    }))

  // Builds the SaveCallOutcomeRequest payload from the current answers and
  // persists it. Returns true on success. Shared by the "Save" completion
  // path and the enroll shortcut so both save the outcome identically.
  //
  // Only answers belonging to sections `computeVisibleSections` currently considers
  // visible are included — if the operator backtracks (e.g. changes Relation from
  // StayMember to Sympathizer after already answering Activity/Engagement), the
  // now-abandoned answers must not be submitted even though they're still sitting
  // in local state.
  const saveOutcome = async () => {
    const visible = computeVisibleSections(answers)
    const has = (section) => visible.includes(section)
    const payload = {
      outcome: answers.outcome,
      attemptNote: answers.attemptNote ?? null,
      partyRelation: has('relation') ? answers.relation ?? null : null,
      activityLevel: has('activity') ? answers.activity ?? null : null,
      wantsToBeActive: has('activity') ? answers.wantsToBeActive ?? null : null,
      engagementAreas: has('engagement') ? answers.engagementAreas ?? [] : [],
      updatedPhone: has('contactData') ? answers.updatedPhone || null : null,
      updatedEmail: has('contactData') ? answers.updatedEmail || null : null,
      updatedAddress: has('contactData') ? answers.updatedAddress || null : null,
      suggestionNote: has('suggestion') ? answers.suggestionNote ?? null : null,
      knowsPotentialMembers: has('recommendations') ? answers.knowsPotentialMembers ?? null : null,
      willingToEnroll: has('recommendations') ? answers.willingToEnroll ?? null : null,
    }
    setSaving(true)
    setSaveError(null)
    try {
      await callCenterApi.saveOutcome(id, payload)
      return true
    } catch (err) {
      setSaveError(err?.response?.data?.message || t('callcenter:script.saveOutcomeFailed'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const finish = async () => {
    const ok = await saveOutcome()
    if (ok) navigate('/callcenter/queue')
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

  const enroll = async () => {
    if (!contact) return
    // Save the outcome (same logic as the "Save" completion path) before
    // navigating away, so FinalStatus/CallAttempt/claim-release happen for the enroll
    // path exactly as they do for the normal completion.
    const ok = await saveOutcome()
    if (!ok) return
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

  const cancel = () => {
    // Fire-and-forget: release this operator's claim so the contact returns to the
    // shared pool immediately. Don't block navigation on it — the stale-claim cutoff
    // on the backend is the safety net if this call fails.
    callCenterApi.releaseClaim(id).catch(() => {})
    navigate('/callcenter/queue')
  }

  if (loading) return <div className="p-6 text-theme-sm text-gray-500 dark:text-gray-400">{t('common:state.loading')}</div>
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

  const canSave = answers.outcome !== undefined

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

      {matches.length > 0 && (
        <div className="mb-6 rounded-lg border border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 px-4 py-3">
          <p className="text-theme-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">
            {t('callcenter:script.possibleMatch')}
          </p>
          <div className="space-y-1.5">
            {matches.map((m) => (
              <div key={m.memberId} className="flex items-center justify-between gap-3">
                <span className="text-theme-xs text-gray-700 dark:text-gray-300">
                  {m.displayName} ({m.committeeName})
                </span>
                {linkedMemberId === m.memberId ? (
                  <span className="text-theme-xs font-medium text-success-600 dark:text-success-400">
                    {t('callcenter:script.linked')}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={linking}
                    onClick={() => link(m.memberId)}
                    className="text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50"
                  >
                    {t('callcenter:script.link')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <section className={sectionClass}>
        <Step title={t('callcenter:script.questions.outcome')}>
          {Object.entries(CALL_OUTCOME).map(([k, v]) => (
            <Radio
              key={v}
              name="outcome"
              label={t(`enums:callOutcome.${toEnumKey(k)}`, k)}
              checked={answers.outcome === v}
              onChange={() => setAnswer('outcome', v)}
            />
          ))}
        </Step>
      </section>

      {isVisible('relation') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.relation')}>
            {Object.entries(PARTY_RELATION).map(([k, v]) => (
              <Radio
                key={v}
                name="relation"
                label={t(`enums:partyRelation.${toEnumKey(k)}`, k)}
                checked={answers.relation === v}
                onChange={() => setAnswer('relation', v)}
              />
            ))}
          </Step>
        </section>
      )}

      {isVisible('activity') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.activity')}>
            {Object.entries(ACTIVITY_LEVEL).map(([k, v]) => (
              <Radio
                key={v}
                name="activity"
                label={t(`enums:activityLevel.${toEnumKey(k)}`, k)}
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
                {t('callcenter:script.questions.wantsActive')}
              </label>
            )}
          </Step>
        </section>
      )}

      {isVisible('engagement') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.engagement')}>
            {Object.entries(ENGAGEMENT_AREA).map(([k, v]) => (
              <label key={v} className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={answers.engagementAreas.includes(v)} onChange={() => toggleArea(v)} />
                {t(`enums:engagementArea.${toEnumKey(k)}`, k)}
              </label>
            ))}
          </Step>
        </section>
      )}

      {isVisible('contactData') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.contactData')}>
            <Field label={t('callcenter:script.fields.phone')} value={answers.updatedPhone} onChange={(v) => setAnswer('updatedPhone', v)} />
            <Field label={t('callcenter:script.fields.email')} value={answers.updatedEmail} onChange={(v) => setAnswer('updatedEmail', v)} />
            <Field label={t('callcenter:script.fields.address')} value={answers.updatedAddress} onChange={(v) => setAnswer('updatedAddress', v)} />
            {!linkedMemberId && !contact.convertedMemberId && (
              <button
                type="button"
                disabled={saving}
                onClick={enroll}
                className="mt-3 rounded-lg border border-brand-300 dark:border-brand-700 px-4 py-2 text-theme-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 disabled:opacity-50"
              >
                {t('callcenter:script.enrollButton')}
              </button>
            )}
          </Step>
        </section>
      )}

      {isVisible('suggestion') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.suggestion')}>
            <textarea
              className={`${inputClass} min-h-24`}
              value={answers.suggestionNote ?? ''}
              onChange={(e) => setAnswer('suggestionNote', e.target.value)}
            />
          </Step>
        </section>
      )}

      {isVisible('recommendations') && (
        <section className={sectionClass}>
          <Step title={t('callcenter:script.questions.recommendationsTitle')}>
            <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={answers.knowsPotentialMembers === true}
                onChange={(e) => setAnswer('knowsPotentialMembers', e.target.checked)}
              />
              {t('callcenter:script.questions.recommendKnows')}
            </label>
            <label className="flex items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={answers.willingToEnroll === true}
                onChange={(e) => setAnswer('willingToEnroll', e.target.checked)}
              />
              {t('callcenter:script.questions.recommendWilling')}
            </label>
          </Step>
        </section>
      )}

      <div className="flex gap-2">
        {canSave && (
          <button
            type="button"
            disabled={saving}
            onClick={finish}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-5 py-2.5 text-theme-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? t('callcenter:script.saving') : t('common:button.save')}
          </button>
        )}
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-theme-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {t('common:button.cancel')}
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
